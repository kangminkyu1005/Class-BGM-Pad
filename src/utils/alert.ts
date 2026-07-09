// react-native-web의 Alert.alert()는 완전히 빈 구현(아무 동작도 안 함)이라,
// 웹에서는 에러/안내 메시지를 하나도 보여주지 못하고 조용히 무시되는 문제가 있었다.
// 이 헬퍼는 플랫폼에 따라 실제로 사용자에게 보이는 방식으로 분기해준다.
import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
