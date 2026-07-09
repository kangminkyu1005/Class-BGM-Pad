// 업로드 가능한 음원 파일 형식(mp3, wav, m4a)인지 검사하는 유틸.
export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a'];

export function isSupportedAudioFile(fileName: string): boolean {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  const extension = match ? match[1].toLowerCase() : '';
  return SUPPORTED_AUDIO_EXTENSIONS.includes(extension);
}
