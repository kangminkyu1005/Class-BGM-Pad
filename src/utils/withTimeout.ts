// 네트워크 작업이 끝나지도, 에러를 던지지도 않고 조용히 멈춰버리는 경우를 대비한 공용 안전장치.
// 지정 시간 안에 promise가 정리되지 않으면 명확한 한국어 에러로 실패시켜서,
// 화면이 무한 로딩 상태로 남는 대신 사용자가 원인 문구를 읽을 수 있게 한다.
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}
