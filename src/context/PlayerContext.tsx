// 앱 전역에서 "지금 어떤 버튼이 재생 중인가"를 공유하기 위한 React Context.
// react-native-track-player의 상태(useActiveTrack/usePlaybackState)를 구독해서
// HomeScreen의 버튼 카드, PlayerBar 등 여러 화면/컴포넌트가 동일한 재생 상태를 바라보게 한다.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { State, useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { BgmButton } from '../types';
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

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [isBusy, setIsBusy] = useState(false);
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  useEffect(() => {
    audioService.setupPlayer().catch((error) => {
      console.warn('[PlayerContext] TrackPlayer 초기화 실패:', error);
    });
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
      activeButtonId: (activeTrack?.id as string | undefined) ?? null,
      isPlaying: playbackState.state === State.Playing,
      isBusy:
        isBusy || playbackState.state === State.Loading || playbackState.state === State.Buffering,
      play,
      pause,
      resume,
      stopAll,
    }),
    [activeTrack, playbackState.state, isBusy, play, pause, resume, stopAll]
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
