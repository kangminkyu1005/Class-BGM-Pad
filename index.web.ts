// 웹 빌드 전용 진입점.
// 네이티브용 index.ts는 react-native-track-player를 import해서 백그라운드 재생 서비스를 등록하지만,
// 웹에서는 audioService.web.ts(HTML5 Audio 기반)를 쓰기 때문에 그 모듈이 전혀 필요 없다.
// Metro는 웹으로 번들링할 때 index.ts 대신 이 파일을 자동으로 선택하므로,
// react-native-track-player(그리고 그 웹 구현이 요구하는 shaka-player)가 웹 번들에 포함되지 않는다.
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
