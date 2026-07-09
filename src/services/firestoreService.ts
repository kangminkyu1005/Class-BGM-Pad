// Firestore의 "bgmButtons" 컬렉션에 대한 CRUD + 실시간 구독을 담당하는 서비스.
// 화면(screens/hooks)에서는 Firestore SDK를 직접 다루지 않고 이 모듈을 통해서만 접근한다.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { BgmButton, BgmButtonInput } from '../types';
import { withTimeout } from '../utils/withTimeout';

const COLLECTION_NAME = 'bgmButtons';

// Firestore 쓰기는 서버가 확인해줄 때까지 promise가 완료되지 않는다. 네트워크가 쓰기 스트림만
// 막는 환경(프록시/확장 프로그램)에서는 에러도 없이 영영 대기 상태가 되므로, 시간 제한을 걸어
// 사용자에게 명확한 원인 문구를 보여준다.
const WRITE_TIMEOUT_MS = 20_000;

function writeTimeoutMessage(action: string): string {
  return (
    `${action}이(가) ${WRITE_TIMEOUT_MS / 1000}초 안에 서버에 저장되지 않았습니다. ` +
    '광고 차단 확장 프로그램이나 네트워크(프록시/방화벽)가 Firestore 연결을 막고 있을 수 있습니다. ' +
    '시크릿 창이나 다른 네트워크(휴대폰 데이터 등)에서 다시 시도해보세요. ' +
    '(저장이 뒤늦게 완료될 수도 있으니, 재시도 전에 목록을 새로고침해 중복 등록을 확인하세요)'
  );
}

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

export interface CreateButtonParams extends BgmButtonInput {
  audioUrl: string;
  storagePath: string;
}

export async function createButton(params: CreateButtonParams): Promise<string> {
  const docRef = await withTimeout(
    addDoc(collection(db, COLLECTION_NAME), {
      title: params.title,
      category: params.category,
      audioUrl: params.audioUrl,
      storagePath: params.storagePath,
      loop: params.loop,
      volume: params.volume,
      color: params.color,
      icon: params.icon,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT_MS,
    writeTimeoutMessage('버튼 정보 저장')
  );
  return docRef.id;
}

export interface UpdateButtonParams extends Partial<BgmButtonInput> {
  audioUrl?: string;
  storagePath?: string;
}

export async function updateButton(id: string, params: UpdateButtonParams): Promise<void> {
  await withTimeout(
    updateDoc(doc(db, COLLECTION_NAME, id), {
      ...params,
      updatedAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT_MS,
    writeTimeoutMessage('버튼 정보 수정')
  );
}

export async function deleteButtonDoc(id: string): Promise<void> {
  await withTimeout(
    deleteDoc(doc(db, COLLECTION_NAME, id)),
    WRITE_TIMEOUT_MS,
    writeTimeoutMessage('버튼 삭제')
  );
}
