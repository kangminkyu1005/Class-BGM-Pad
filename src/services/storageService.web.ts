// 웹(브라우저)에서 Firebase Storage에 음원 파일을 업로드/삭제하는 서비스.
//
// 네이티브와 달리 여기서는 uploadBytesResumable(재개 가능한 업로드) 대신 uploadBytes(단일 요청
// 업로드)를 쓴다. 이유: 재개 가능한 업로드는 진행 중 여러 요청에 걸쳐 X-Goog-Upload-Status,
// X-Goog-Upload-URL 같은 커스텀 응답 헤더를 읽어야 하는데, Firebase Storage REST API
// (firebasestorage.googleapis.com)의 CORS 응답이 그 헤더들을 Access-Control-Expose-Headers로
// 노출하지 않는다. 그 결과 브라우저에서는 서버에 파일이 실제로는 업로드되는데도 클라이언트
// JS가 "끝났다"는 신호를 영영 읽지 못해 화면이 멈춘 것처럼 보이는 문제가 있었다
// (GCS 버킷 레벨 CORS 설정을 아무리 고쳐도 이 문제는 해결되지 않는다 - Firebase의 REST API
// 앞단이 별도의 고정된 CORS 정책을 갖고 있기 때문).
// uploadBytes는 단일 POST 요청(멀티파트)이라 완료 여부를 응답 바디(JSON)로만 확인하면 되고,
// 응답 바디를 읽는 건 커스텀 헤더 노출 여부와 무관하게 항상 허용되므로 이 문제가 생기지 않는다.
// 대신 업로드 도중 세밀한 진행률(%)은 제공하지 않는다(시작 0% / 완료 100%만 보고).
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';
import { withTimeout } from '../utils/withTimeout';

const AUDIO_FOLDER = 'bgm-audio';
const UPLOAD_TIMEOUT_MS = 60_000;
const URL_TIMEOUT_MS = 15_000;

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
 * @param onProgress 0~1 사이의 업로드 진행률 콜백 (선택) - 웹에서는 0(시작)과 1(완료)만 전달된다.
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
  onProgress?.(0);
  await withTimeout(
    uploadBytes(storageRef, blob),
    UPLOAD_TIMEOUT_MS,
    `음원 업로드가 ${UPLOAD_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다. 네트워크 상태를 확인하고 다시 시도해주세요.`
  );
  onProgress?.(1);

  onStep?.('다운로드 주소 확인 중...');
  const audioUrl = await withTimeout(
    getDownloadURL(storageRef),
    URL_TIMEOUT_MS,
    `다운로드 주소 확인이 ${URL_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다. 네트워크 상태를 확인하고 다시 시도해주세요.`
  );
  return { audioUrl, storagePath };
}

export async function deleteAudioFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    // 이미 삭제되었거나 존재하지 않는 파일이면 무시한다 (Firestore 문서 삭제는 계속 진행되어야 함).
    console.warn('[storageService.web] deleteAudioFile 실패(무시):', error);
  }
}
