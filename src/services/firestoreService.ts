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

const COLLECTION_NAME = 'bgmButtons';

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
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
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
  });
  return docRef.id;
}

export interface UpdateButtonParams extends Partial<BgmButtonInput> {
  audioUrl?: string;
  storagePath?: string;
}

export async function updateButton(id: string, params: UpdateButtonParams): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...params,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteButtonDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
