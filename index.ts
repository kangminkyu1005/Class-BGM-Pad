// 앱의 진입점.
// 1) registerRootComponent로 App을 등록하고,
// 2) TrackPlayer.registerPlaybackService로 "백그라운드 재생 서비스"를 등록한다.
//    이 등록이 있어야 앱이 백그라운드/잠금화면 상태에서도 재생이 유지되고,
//    잠금화면의 재생/일시정지/정지 컨트롤이 동작한다.
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { PlaybackService } from './src/services/playbackService';

registerRootComponent(App);
TrackPlayer.registerPlaybackService(() => PlaybackService);
