// react-native-track-player를 감싸는 얇은 래퍼.
// 앱의 나머지 코드(Context/화면)는 TrackPlayer를 직접 다루지 않고 이 모듈의 함수만 사용한다.
// -> 나중에 오디오 라이브러리를 바꾸더라도 이 파일만 고치면 되도록 관심사를 분리한다.
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from 'react-native-track-player';
import { BgmButton } from '../types';
import { getPlaybackUri } from './cacheService';

let didSetupPlayer = false;

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
