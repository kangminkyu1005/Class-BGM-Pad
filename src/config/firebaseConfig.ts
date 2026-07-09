// Firebase 앱을 초기화하고, 앱 전역에서 재사용할 Firestore/Storage 인스턴스를 내보내는 파일.
// 값은 .env 파일의 EXPO_PUBLIC_* 환경변수에서 읽어온다. (.env.example 참고)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
