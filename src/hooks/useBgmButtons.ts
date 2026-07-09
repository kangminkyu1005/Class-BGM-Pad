// Firestore의 bgmButtons 컬렉션을 실시간 구독해서 화면에 필요한 형태로 제공하는 커스텀 훅.
import { useEffect, useState } from 'react';
import { subscribeToButtons } from '../services/firestoreService';
import { BgmButton } from '../types';

interface UseBgmButtonsResult {
  buttons: BgmButton[];
  loading: boolean;
  error: string | null;
}

export function useBgmButtons(): UseBgmButtonsResult {
  const [buttons, setButtons] = useState<BgmButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToButtons(
      (nextButtons) => {
        setButtons(nextButtons);
        setLoading(false);
      },
      (err) => {
        console.warn('[useBgmButtons] Firestore 구독 오류:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { buttons, loading, error };
}
