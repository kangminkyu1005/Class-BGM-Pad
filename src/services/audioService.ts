// react-native-track-player를 감싸는 얇은 래퍼. (네이티브 전용 구현)
// 앱의 나머지 코드(Context/화면)는 TrackPlayer를 직접 다루지 않고 이 모듈의 함수만 사용한다.
// 웹 빌드에서는 Metro가 이 파일 대신 같은 이름의 audioService.web.ts를 자동으로 선택하므로,
// 두 파일은 반드시 동일한 함수 시그니처(이름/파라미터/반환 타입)를 유지해야 한다.
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
} from 'react-native-track-player';
import { BgmButton, PlayerStatus } from '../types';
import { getPlaybackUri } from './cacheService';

let didSetupPlayer = false;
let currentActiveButtonId: string | null = null;
let currentPlaybackState: State = State.None;
let statusListeners: Array<(status: PlayerStatus) => void> = [];

function computeStatus(): PlayerStatus {
  return {
    activeButtonId: currentActiveButtonId,
    isPlaying: currentPlaybackState === State.Playing,
    isBuffering:
      currentPlaybackState === State.Loading || currentPlaybackState === State.Buffering,
  };
}

function emitStatus(): void {
  const status = computeStatus();
  statusListeners.forEach((listener) => listener(status));
}

/** 앱 시작 시(또는 첫 재생 직전) 한 번만 호출되는 TrackPlayer 초기화. */
export async function setupPlayer(): Promise<void> {
  if (didSetupPlayer) return;

  await TrackPlayer.setupPlayer({});
  await TrackPlayer.updateOptions({
    android: {
      // 앱이 최근 앱 목록에서 스와이프로 종료되어도 재생/알림을 유지 (수업 중 실수로 앱을 내려도 음악 유지).
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    // 잠금화면 및 알림에 노출할 컨트롤
    capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
  });

  // PlayerContext가 화면에 "현재 재생 버튼 / 재생 중 여부"를 보여줄 수 있도록 상태 변화를 구독해둔다.
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    currentActiveButtonId = (event.track?.id as string | undefined) ?? null;
    emitStatus();
  });
  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    currentPlaybackState = event.state;
    emitStatus();
  });

  didSetupPlayer = true;
}

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return 1;
  return Math.min(1, Math.max(0, volume));
}

/**
 * 버튼 하나를 재생한다. 기존에 재생 중이던 음원이 있다면 먼저 정지시키고 새 음원으로 교체한다.
 * (요구사항: "다른 버튼을 누르면 기존 재생을 멈추고 새 음원을 재생한다")
 */
export async function playButton(button: BgmButton): Promise<void> {
  await setupPlayer();

  const uri = await getPlaybackUri(button);

  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: button.id,
    url: uri,
    title: button.title,
    artist: 'Class BGM Pad',
  });
  await TrackPlayer.setRepeatMode(button.loop ? RepeatMode.Track : RepeatMode.Off);
  await TrackPlayer.setVolume(clampVolume(button.volume));
  await TrackPlayer.play();
}

export async function pausePlayback(): Promise<void> {
  await TrackPlayer.pause();
}

export async function resumePlayback(): Promise<void> {
  await TrackPlayer.play();
}

/** 전체 정지 버튼에서 사용. 큐를 완전히 비워서 재생/알림을 모두 종료한다. */
export async function stopAll(): Promise<void> {
  await TrackPlayer.reset();
}

/** 현재 재생 상태의 스냅샷. (구독 전 초기값을 그릴 때 사용) */
export function getStatus(): PlayerStatus {
  return computeStatus();
}

/** 재생 상태가 바뀔 때마다 호출될 리스너를 등록한다. 반환된 함수를 호출하면 구독이 해제된다. */
export function subscribeStatus(listener: (status: PlayerStatus) => void): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}
