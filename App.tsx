// 앱의 루트 컴포넌트. 전역 Provider(안전영역, 재생 상태)와 네비게이션을 조립한다.
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayerProvider } from './src/context/PlayerContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
