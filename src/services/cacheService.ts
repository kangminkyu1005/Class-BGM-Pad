// 자주 쓰는 음원을 기기 캐시 디렉터리에 저장해서, 네트워크가 불안정해도 재생이 끊기지 않게 해주는 서비스. (네이티브 전용 구현)
// 정책: 재생을 시작할 때 캐시에 파일이 있으면 그걸 바로 쓰고, 없으면 Storage URL로 스트리밍하면서
//       동시에 다음 재생을 위해 백그라운드로 캐시 파일을 내려받는다.
// 웹 빌드에서는 Metro가 이 파일 대신 cacheService.web.ts(Cache Storage API 기반)를 선택한다.
// -> 웹 구현은 본질적으로 비동기라서, 이 파일의 모든 공개 함수도 시그니처를 async로 맞춘다.
import { Directory, File, Paths } from 'expo-file-system';
import { BgmButton } from '../types';

const cacheDirectory = new Directory(Paths.cache, 'bgm-cache');

function ensureCacheDirectory(): void {
  if (!cacheDirectory.exists) {
    cacheDirectory.create({ intermediates: true, idempotent: true });
  }
}

function extensionOf(path: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(path);
  return match ? match[1] : 'audio';
}

function cacheFileFor(button: BgmButton): File {
  ensureCacheDirectory();
  return new File(cacheDirectory, `${button.id}.${extensionOf(button.storagePath)}`);
}

/** 이미 캐시된 로컬 파일이 있으면 그 file:// uri를, 없으면 null을 반환한다. */
export function getCachedUri(button: BgmButton): string | null {
  const file = cacheFileFor(button);
  return file.exists ? file.uri : null;
}

/** 캐시가 없을 때 백그라운드에서 내려받는다. 실패해도 스트리밍 재생에는 영향이 없도록 예외를 삼킨다. */
export async function cacheInBackground(button: BgmButton): Promise<void> {
  const file = cacheFileFor(button);
  if (file.exists) return;
  try {
    await File.downloadFileAsync(button.audioUrl, file, { idempotent: true });
  } catch (error) {
    console.warn('[cacheService] 캐시 다운로드 실패(무시):', error);
  }
}

/** 재생에 사용할 uri를 결정한다. 캐시가 있으면 즉시 로컬 uri, 없으면 원격 URL을 반환하고 캐싱을 예약한다. */
export async function getPlaybackUri(button: BgmButton): Promise<string> {
  const cachedUri = getCachedUri(button);
  if (cachedUri) return cachedUri;

  void cacheInBackground(button);
  return button.audioUrl;
}

/** 버튼이 삭제될 때 해당 캐시 파일도 함께 정리한다. */
export async function removeCachedFile(button: BgmButton): Promise<void> {
  const file = cacheFileFor(button);
  if (file.exists) file.delete();
}

/** 설정 화면의 "캐시 비우기" 버튼에서 사용. */
export async function clearCache(): Promise<void> {
  if (cacheDirectory.exists) cacheDirectory.delete();
}

/** 설정 화면에 현재 캐시 용량을 보여주기 위한 함수. */
export async function getCacheSizeBytes(): Promise<number> {
  ensureCacheDirectory();
  return cacheDirectory.size ?? 0;
}
