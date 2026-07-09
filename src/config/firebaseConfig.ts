// Firebase 앱을 초기화하고, 앱 전역에서 재사용할 Firestore/Storage 인스턴스를 내보내는 파일.
// 값은 .env 파일의 EXPO_PUBLIC_* 환경변수에서 읽어온다. (.env.example 참고)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    '[firebaseConfig] Firebase 환경변수가 설정되지 않았습니다. ' +
      '.env 파일을 만들고 EXPO_PUBLIC_FIREBASE_* 값을 채워주세요. (README 참고)'
  );
}

// Metro의 fast refresh로 파일이 재평가되어도 앱을 중복 초기화하지 않도록 방어.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 웹에서 일부 네트워크 환경(프록시, 보안 소프트웨어, 광고 차단 확장 프로그램 등)은 Firestore의
// 기본 전송 방식(WebChannel 스트리밍)의 응답을 무한정 버퍼링해버린다. 그러면 "읽기(목록 표시)는
// 되는데 쓰기(addDoc 등)만 영영 완료되지 않는" 증상이 생긴다 (버튼 저장이 무한 로딩으로 멈춤).
// long-polling을 강제하면 서버 응답이 매번 즉시 닫히므로 이런 환경에서도 쓰기가 정상 동작한다.
// (네이티브 앱은 이 문제가 없어 기본 설정을 그대로 쓴다.)
function createFirestore() {
  try {
    return initializeFirestore(
      firebaseApp,
      Platform.OS === 'web' ? { experimentalForceLongPolling: true } : {}
    );
  } catch {
    // fast refresh 등으로 이미 초기화된 경우에는 기존 인스턴스를 재사용한다.
    return getFirestore(firebaseApp);
  }
}

export const db = createFirestore();
export const storage = getStorage(firebaseApp);
