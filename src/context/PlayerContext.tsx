// 앱 전역에서 "지금 어떤 버튼이 재생 중인가"를 공유하기 위한 React Context.
// audioService(네이티브: react-native-track-player / 웹: HTML5 Audio)가 내보내는
// 공통 상태(PlayerStatus)를 구독해서, HomeScreen의 버튼 카드/PlayerBar 등이 동일한 재생 상태를 바라보게 한다.
// 이 파일은 어떤 재생 엔진을 쓰는지 전혀 알지 못한다 (플랫폼에 무관하게 그대로 재사용된다).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BgmButton, PlayerStatus } from '../types';
import * as audioService from '../services/audioService';

interface PlayerContextValue {
  /** 현재 재생 큐에 로드되어 있는 버튼의 id (없으면 null) */
  activeButtonId: string | null;
  /** 현재 실제로 소리가 나오고 있는지 여부 */
  isPlaying: boolean;
  /** 재생 준비 중(로딩/버퍼링/전환 중)인지 여부 - 버튼 탭 직후 중복 탭 방지에 사용 */
  isBusy: boolean;
  play: (button: BgmButton) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stopAll: () => Promise<void>;
}

const INITIAL_STATUS: PlayerStatus = {
  activeButtonId: null,
  isPlaying: false,
  isBuffering: false,
};

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PlayerStatus>(INITIAL_STATUS);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    audioService
      .setupPlayer()
      .then(() => setStatus(audioService.getStatus()))
      .catch((error) => {
        console.warn('[PlayerContext] 오디오 초기화 실패:', error);
      });

    return audioService.subscribeStatus(setStatus);
  }, []);

  const play = useCallback(async (button: BgmButton) => {
    setIsBusy(true);
    try {
      await audioService.playButton(button);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const pause = useCallback(async () => {
    await audioService.pausePlayback();
  }, []);

  const resume = useCallback(async () => {
    await audioService.resumePlayback();
  }, []);

  const stopAll = useCallback(async () => {
    await audioService.stopAll();
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      activeButtonId: status.activeButtonId,
      isPlaying: status.isPlaying,
      isBusy: isBusy || status.isBuffering,
      play,
      pause,
      resume,
      stopAll,
    }),
    [status, isBusy, play, pause, resume, stopAll]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer()는 반드시 <PlayerProvider> 하위에서 호출해야 합니다.');
  }
  return context;
}
