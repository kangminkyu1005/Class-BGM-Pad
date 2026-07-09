// Firebase Storage에 음원 파일을 업로드/삭제하는 서비스. (네이티브 전용 구현)
// 로컬 파일(uri)을 fetch로 읽어 Blob으로 변환한 뒤 Storage에 올리는, React Native + Firebase JS SDK의 표준 방식을 사용한다.
// 웹 빌드에서는 Metro가 이 파일 대신 storageService.web.ts를 선택한다 (이유는 그 파일 상단 주석 참고).
// -> 두 파일은 반드시 동일한 함수 시그니처(이름/파라미터/반환 타입)를 유지해야 한다.
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

const AUDIO_FOLDER = 'bgm-audio';
// 네트워크나 CORS 문제로 업로드가 끝나지도, 에러를 던지지도 않고 그냥 멈춰버리는 경우를 대비한 안전장치.
// 이 시간이 지나면 업로드를 취소하고 명확한 에러로 실패시켜서, 화면이 무한 로딩 상태로 남지 않게 한다.
const UPLOAD_TIMEOUT_MS = 60_000;

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
 * @param onStep 현재 진행 중인 단계를 화면에 표시하기 위한 콜백 (선택) - 어느 단계에서 멈추는지 진단에도 쓰인다
 */
export async function uploadAudioFile(
  localUri: string,
  fileName: string,
  onProgress?: (progress: number) => void,
  onStep?: (step: string) => void
): Promise<UploadResult> {
  onStep?.('음원 파일 읽는 중...');
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storagePath = `${AUDIO_FOLDER}/${Date.now()}-${sanitizeFileName(fileName)}`;
  const storageRef = ref(storage, storagePath);

  onStep?.('음원 업로드 중...');
  const uploadTask = uploadBytesResumable(storageRef, blob);

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(
        new Error(
          `업로드가 ${UPLOAD_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다. 네트워크 상태나 Storage CORS 설정을 확인하고 다시 시도해주세요.`
        )
      );
    }, UPLOAD_TIMEOUT_MS);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      () => {
        clearTimeout(timeoutId);
        resolve();
      }
    );
  });

  onStep?.('다운로드 주소 확인 중...');
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
