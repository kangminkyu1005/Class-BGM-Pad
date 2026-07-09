// 앱 전역에서 공유하는 타입 정의.

/** Firestore "bgmButtons" 컬렉션의 문서 하나에 대응하는 타입 */
export interface BgmButton {
  id: string;
  title: string;
  category: string;
  audioUrl: string; // Firebase Storage 다운로드 URL (스트리밍/캐시 원본)
  storagePath: string; // Firebase Storage 안의 실제 파일 경로 (삭제 시 필요)
  loop: boolean;
  volume: number; // 0 ~ 1
  color: string; // hex 색상 (#RRGGBB)
  icon: string; // 이모지 아이콘
  createdAt: number; // epoch millis
  updatedAt: number; // epoch millis
}

/** 새 버튼 생성 시 사용자가 입력하는 값 (id/시간/파일URL은 생성 과정에서 채워짐) */
export interface BgmButtonInput {
  title: string;
  category: string;
  loop: boolean;
  volume: number;
  color: string;
  icon: string;
}

/** 로컬(AsyncStorage)에 저장하는 사용자 기본 설정 */
export interface AppSettings {
  defaultLoop: boolean;
  defaultVolume: number;
}

/**
 * 재생 상태의 플랫폼 공통 표현.
 * audioService(네이티브)/audioService.web(웹)이 각자의 재생 엔진 상태를 이 형태로 변환해서 알려준다.
 * PlayerContext는 이 타입만 알면 되고, 실제 재생 엔진이 무엇인지는 몰라도 된다.
 */
export interface PlayerStatus {
  activeButtonId: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
}
