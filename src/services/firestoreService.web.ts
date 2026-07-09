// 웹 전용 Firestore 서비스.
//
// 읽기(실시간 구독)는 SDK의 onSnapshot을 그대로 쓰지만, 쓰기(추가/수정/삭제)는 SDK 대신
// Firestore REST API(https://firestore.googleapis.com/v1/...)를 단순 fetch로 직접 호출한다.
//
// 이유: 일부 네트워크(프록시/보안 소프트웨어) 환경에서 Firestore SDK의 전송 방식(WebChannel)으로는
// 읽기는 되는데 쓰기(addDoc 등)만 서버에 영영 도달하지 못하는 문제가 실제로 발생했고,
// 공식 우회책인 experimentalForceLongPolling으로도 해결되지 않았다.
// 반면 같은 네트워크에서 단순 POST fetch(Storage 업로드)는 정상 동작하는 것이 확인됐으므로,
// 쓰기만 REST API(단순 HTTP 요청)로 전환해 네트워크가 확실히 통과시키는 방식을 쓴다.
// REST 쓰기도 Firestore 보안 규칙을 동일하게 적용받으며, 실패 시 HTTP 상태코드가 그대로
// 에러 메시지에 표시되므로 진단도 쉬워진다.
//
// 네이티브(firestoreService.ts)는 이 문제가 없어 SDK 쓰기를 그대로 유지한다.
// -> 두 파일은 반드시 동일한 함수 시그니처(이름/파라미터/반환 타입)를 유지해야 한다.
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { BgmButton, BgmButtonInput } from '../types';
import { withTimeout } from '../utils/withTimeout';

const COLLECTION_NAME = 'bgmButtons';
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const WRITE_TIMEOUT_MS = 15_000;

function toMillis(value: Timestamp | number | undefined): number {
  if (!value) return Date.now();
  return value instanceof Timestamp ? value.toMillis() : value;
}

/** Firestore 실시간 리스너를 등록한다. 반환된 함수를 호출하면 구독이 해제된다. */
export function subscribeToButtons(
  onChange: (buttons: BgmButton[]) => void,
  onError: (error: Error) => void
): () => void {
  const buttonsQuery = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'asc'));

  return onSnapshot(
    buttonsQuery,
    (snapshot) => {
      const buttons: BgmButton[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          category: data.category,
          audioUrl: data.audioUrl,
          storagePath: data.storagePath,
          loop: data.loop,
          volume: data.volume,
          color: data.color,
          icon: data.icon,
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        };
      });
      onChange(buttons);
    },
    onError
  );
}

// ----- Firestore REST API 쓰기 구현 -----

// REST API는 값을 {"stringValue": ...} 같은 타입 태그 형태로 주고받는다.
type RestValue =
  | { stringValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string };

function encodeValue(value: string | number | boolean): RestValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { doubleValue: value };
}

// SDK의 serverTimestamp() 대신 클라이언트 시각을 쓴다. 이 앱에서 시각은 목록 정렬용이라
// 기기 시계 수준의 정확도면 충분하다. (읽는 쪽에서는 SDK가 Timestamp 객체로 변환해준다.)
function nowTimestamp(): RestValue {
  return { timestampValue: new Date().toISOString() };
}

async function restRequest(method: string, url: string, body?: unknown): Promise<any> {
  const response = await withTimeout(
    fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
    WRITE_TIMEOUT_MS,
    `Firestore 요청이 ${WRITE_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다. 네트워크 상태를 확인하고 다시 시도해주세요.`
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Firestore 저장 실패 (HTTP ${response.status}): ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

export interface CreateButtonParams extends BgmButtonInput {
  audioUrl: string;
  storagePath: string;
}

export async function createButton(params: CreateButtonParams): Promise<string> {
  const result = await restRequest('POST', `${REST_BASE}/${COLLECTION_NAME}`, {
    fields: {
      title: encodeValue(params.title),
      category: encodeValue(params.category),
      audioUrl: encodeValue(params.audioUrl),
      storagePath: encodeValue(params.storagePath),
      loop: encodeValue(params.loop),
      volume: encodeValue(params.volume),
      color: encodeValue(params.color),
      icon: encodeValue(params.icon),
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    },
  });

  // result.name 형식: "projects/<pid>/databases/(default)/documents/bgmButtons/<문서ID>"
  const name: string = result.name ?? '';
  return name.split('/').pop() ?? '';
}

export interface UpdateButtonParams extends Partial<BgmButtonInput> {
  audioUrl?: string;
  storagePath?: string;
}

export async function updateButton(id: string, params: UpdateButtonParams): Promise<void> {
  const fields: Record<string, RestValue> = { updatedAt: nowTimestamp() };
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      fields[key] = encodeValue(value as string | number | boolean);
    }
  }

  // updateMask를 지정하지 않으면 PATCH가 문서 전체를 교체해서, 이번에 보내지 않은 필드
  // (예: 음원을 교체하지 않았을 때의 audioUrl/storagePath)가 삭제되어 버린다. 반드시 명시한다.
  const mask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&');

  await restRequest('PATCH', `${REST_BASE}/${COLLECTION_NAME}/${id}?${mask}`, { fields });
}

export async function deleteButtonDoc(id: string): Promise<void> {
  await restRequest('DELETE', `${REST_BASE}/${COLLECTION_NAME}/${id}`);
}
