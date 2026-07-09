// 앱 전역 색상/여백 등 공통 디자인 토큰.
export const theme = {
  colors: {
    background: '#0F1220',
    surface: '#1B1F33',
    surfaceAlt: '#262B45',
    border: '#343A5C',
    text: '#F5F6FA',
    textMuted: '#9AA0C3',
    primary: '#6C8CFF',
    danger: '#FF6B6B',
    success: '#4CD990',
  },
  spacing: (n: number) => n * 8,
  radius: {
    sm: 8,
    md: 14,
    lg: 22,
  },
};
