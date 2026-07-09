// 웹(브라우저)에서 자주 쓰는 음원을 캐싱하는 서비스.
// 네이티브처럼 파일시스템에 직접 쓸 수 없으므로, 브라우저 표준 Cache Storage API(caches)를 사용한다.
// cacheService.ts와 동일한 함수 시그니처를 유지해서, 상위 코드(audioService 등)는 플랫폼을 신경쓰지 않는다.
import { BgmButton } from '../types';

const CACHE_NAME = 'class-bgm-pad-audio-v1';

function isCacheApiAvailable(): boolean {
  return typeof caches !== 'undefined';
}

function cacheKeyFor(button: BgmButton): string {
  // Cache Storage는 Request/문자열 URL을 키로 쓰므로, 버튼 id를 가상의 경로로 사용한다.
  return `/class-bgm-pad-cache/${button.id}`;
}

async function findCachedResponse(button: BgmButton): Promise<Response | undefined> {
  if (!isCacheApiAvailable()) return undefined;
  const cache = await caches.open(CACHE_NAME);
  return cache.match(cacheKeyFor(button));
}

/** 캐시가 없을 때 백그라운드에서 내려받는다. 실패해도 스트리밍 재생에는 영향이 없도록 예외를 삼킨다. */
export async function cacheInBackground(button: BgmButton): Promise<void> {
  if (!isCacheApiAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = cacheKeyFor(button);
    const alreadyCached = await cache.match(key);
    if (alreadyCached) return;

    const response = await fetch(button.audioUrl);
    if (!response.ok) return;
    await cache.put(key, response);
  } catch (error) {
    console.warn('[cacheService.web] 캐시 다운로드 실패(무시):', error);
  }
}

/** 재생에 사용할 uri를 결정한다. 캐시가 있으면 즉시 로컬 blob uri, 없으면 원격 URL을 반환하고 캐싱을 예약한다. */
export async function getPlaybackUri(button: BgmButton): Promise<string> {
  const cached = await findCachedResponse(button);
  if (cached) {
    const blob = await cached.blob();
    return URL.createObjectURL(blob);
  }

  void cacheInBackground(button);
  return button.audioUrl;
}

/** 버튼이 삭제될 때 해당 캐시 항목도 함께 정리한다. */
export async function removeCachedFile(button: BgmButton): Promise<void> {
  if (!isCacheApiAvailable()) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(cacheKeyFor(button));
}

/** 설정 화면의 "캐시 비우기" 버튼에서 사용. */
export async function clearCache(): Promise<void> {
  if (!isCacheApiAvailable()) return;
  await caches.delete(CACHE_NAME);
}

/** 설정 화면에 현재 캐시 용량을 보여주기 위한 함수. */
export async function getCacheSizeBytes(): Promise<number> {
  if (!isCacheApiAvailable()) return 0;
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();

  let total = 0;
  for (const request of requests) {
    const response = await cache.match(request);
    if (!response) continue;
    const blob = await response.clone().blob();
    total += blob.size;
  }
  return total;
}
