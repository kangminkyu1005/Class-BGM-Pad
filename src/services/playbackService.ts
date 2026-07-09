// react-native-track-player의 "백그라운드 재생 서비스" 핸들러.
// 앱이 백그라운드/잠금화면 상태일 때 잠금화면·알림의 재생/일시정지/정지 버튼이 눌리면
// 이 함수 안의 이벤트 리스너가 (JS 엔진이 별도 헤드리스 컨텍스트에서) 호출된다.
// index.ts에서 TrackPlayer.registerPlaybackService(() => PlaybackService) 로 등록한다.
import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());

  // 전화 수신 등 다른 오디오와 겹칠 때(오디오 더킹) 일시정지하고, 끝나면 필요 시 이어서 재생.
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      await TrackPlayer.pause();
      return;
    }
    if (paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });
}
