// Firebase Storage에 음원 파일을 업로드/삭제하는 서비스.
// 로컬 파일(uri)을 fetch로 읽어 Blob으로 변환한 뒤 Storage에 올리는, React Native + Firebase JS SDK의 표준 방식을 사용한다.
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

const AUDIO_FOLDER = 'bgm-audio';

export interface UploadResult {
  audioUrl: string;
  storagePath: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/**
 * 로컬 음원 파일(mp3/wav/m4a)을 Firebase Storage에 업로드한다.
 * @param localUri  expo-document-picker가 반환한 로컬 파일 uri
 * @param fileName  원본 파일 이름 (확장자 포함)
 * @param onProgress 0~1 사이의 업로드 진행률 콜백 (선택)
 */
export async function uploadAudioFile(
  localUri: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storagePath = `${AUDIO_FOLDER}/${Date.now()}-${sanitizeFileName(fileName)}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, blob);

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
        }
      },
      reject,
      () => resolve()
    );
  });

  const audioUrl = await getDownloadURL(storageRef);
  return { audioUrl, storagePath };
}

export async function deleteAudioFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    // 이미 삭제되었거나 존재하지 않는 파일이면 무시한다 (Firestore 문서 삭제는 계속 진행되어야 함).
    console.warn('[storageService] deleteAudioFile 실패(무시):', error);
  }
}
