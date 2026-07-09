// 웹(브라우저) 환경에서의 재생 구현체.
// react-native-track-player 대신, 브라우저 표준 API인 HTML5 <audio> + Media Session API만 사용한다.
// (RNTP의 웹 구현은 shaka-player라는 무거운 스트리밍 라이브러리가 필요해서 이 프로젝트의 단순한
//  mp3/wav/m4a 재생에는 과하다고 판단해 별도 구현으로 대체했다.)
// Metro가 네이티브 빌드에서는 audioService.ts를, 웹 빌드에서는 이 파일을 자동으로 선택한다.
// -> audioService.ts와 동일한 함수 시그니처를 유지해야 한다.
import { BgmButton, PlayerStatus } from '../types';
import { getPlaybackUri } from './cacheService';

let audioEl: HTMLAudioElement | null = null;
let currentButton: BgmButton | null = null;
let isBuffering = false;
let statusListeners: Array<(status: PlayerStatus) => void> = [];

function computeStatus(): PlayerStatus {
  return {
    activeButtonId: currentButton?.id ?? null,
    isPlaying: !!audioEl && !audioEl.paused && !audioEl.ended,
    isBuffering,
  };
}

function emitStatus(): void {
  const status = computeStatus();
  statusListeners.forEach((listener) => listener(status));
}

function ensureAudioElement(): HTMLAudioElement {
  if (audioEl) return audioEl;

  const el = new Audio();
  el.addEventListener('playing', () => {
    isBuffering = false;
    emitStatus();
  });
  el.addEventListener('pause', emitStatus);
  el.addEventListener('ended', emitStatus);
  el.addEventListener('waiting', () => {
    isBuffering = true;
    emitStatus();
  });
  audioEl = el;
  return el;
}

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return 1;
  return Math.min(1, Math.max(0, volume));
}

/** 브라우저 잠금화면/알림 영역에 "지금 재생 중" 정보와 컨트롤을 노출한다. (지원 브라우저에 한함) */
function updateMediaSession(button: BgmButton | null): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  if (!button) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: button.title,
    artist: 'Class BGM Pad',
    album: button.category,
  });
  navigator.mediaSession.setActionHandler('play', () => {
    void resumePlayback();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    void pausePlayback();
  });
  navigator.mediaSession.setActionHandler('stop', () => {
    void stopAll();
  });
}

export async function setupPlayer(): Promise<void> {
  ensureAudioElement();
}

/**
 * 버튼 하나를 재생한다. 기존에 재생 중이던 음원이 있다면 먼저 정지시키고 새 음원으로 교체한다.
 * (요구사항: "다른 버튼을 누르면 기존 재생을 멈추고 새 음원을 재생한다")
 */
export async function playButton(button: BgmButton): Promise<void> {
  const el = ensureAudioElement();
  const uri = await getPlaybackUri(button);

  currentButton = button;
  isBuffering = true;
  el.pause();
  el.src = uri;
  el.loop = button.loop;
  el.volume = clampVolume(button.volume);
  updateMediaSession(button);

  try {
    await el.play();
  } catch (error) {
    console.warn('[audioService.web] 재생 실패:', error);
  }
  emitStatus();
}

export async function pausePlayback(): Promise<void> {
  audioEl?.pause();
}

export async function resumePlayback(): Promise<void> {
  await audioEl?.play();
}

/** 전체 정지 버튼에서 사용. */
export async function stopAll(): Promise<void> {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
  }
  currentButton = null;
  isBuffering = false;
  updateMediaSession(null);
  emitStatus();
}

export function getStatus(): PlayerStatus {
  return computeStatus();
}

export function subscribeStatus(listener: (status: PlayerStatus) => void): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}
