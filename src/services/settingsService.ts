// 기기별 사용자 설정(기본 반복 여부, 기본 볼륨)을 AsyncStorage에 저장/조회하는 서비스.
// Firestore가 아니라 로컬에 두는 이유: 이 값은 "새 버튼 추가 폼의 기본값"일 뿐, 여러 기기 간 동기화가 필요 없다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = '@class-bgm-pad/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultLoop: true,
  defaultVolume: 1,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    console.warn('[settingsService] 설정 불러오기 실패, 기본값 사용:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
