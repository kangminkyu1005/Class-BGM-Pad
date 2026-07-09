// 버튼 추가/수정 화면에서 사용자가 고를 수 있는 색상/아이콘 프리셋 목록.
// 아이콘은 별도 벡터 아이콘 라이브러리 없이 이모지로 표현해 크로스플랫폼에서 바로 동작하게 한다.

export const BUTTON_COLORS: string[] = [
  '#6C8CFF', // blue
  '#4CD990', // green
  '#FFC94C', // yellow
  '#FF6B6B', // red
  '#B96CFF', // purple
  '#4CD9D9', // teal
  '#FF9F4C', // orange
  '#FF6CC9', // pink
];

export const BUTTON_ICONS: string[] = [
  '🎵', '🎶', '🎧', '🔔', '⏰', '🎉', '👏', '🤫',
  '📢', '🧘', '⚡', '🌙', '☀️', '🎬', '📚', '✅',
];

export const DEFAULT_CATEGORY = '기타';

// 기본 제공 카테고리 (사용자는 자유 입력으로 새 카테고리도 만들 수 있음)
export const SUGGESTED_CATEGORIES: string[] = [
  '입장/퇴장',
  '집중',
  '휴식',
  '타이머',
  '효과음',
  DEFAULT_CATEGORY,
];
