// 설정 화면: 새 버튼 추가 시 기본으로 쓰일 반복재생/볼륨 값과, 로컬 오디오 캐시 관리를 제공한다.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoopToggle } from '../components/LoopToggle';
import { PrimaryButton } from '../components/PrimaryButton';
import { VolumeSlider } from '../components/VolumeSlider';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { clearCache, getCacheSizeBytes } from '../services/cacheService';
import { getSettings, saveSettings } from '../services/settingsService';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsScreen(_props: Props) {
  const [defaultLoop, setDefaultLoop] = useState(true);
  const [defaultVolume, setDefaultVolume] = useState(1);
  const [cacheSize, setCacheSize] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refreshCacheSize = useCallback(() => {
    setCacheSize(getCacheSizeBytes());
  }, []);

  useEffect(() => {
    getSettings().then((settings) => {
      setDefaultLoop(settings.defaultLoop);
      setDefaultVolume(settings.defaultVolume);
      setLoaded(true);
    });
    refreshCacheSize();
  }, [refreshCacheSize]);

  useEffect(() => {
    if (!loaded) return;
    saveSettings({ defaultLoop, defaultVolume }).catch((error) => {
      console.warn('[SettingsScreen] 설정 저장 실패:', error);
    });
  }, [loaded, defaultLoop, defaultVolume]);

  function handleClearCache() {
    Alert.alert('캐시 비우기', '기기에 저장된 음원 캐시를 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          clearCache();
          refreshCacheSize();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.screenTitle}>설정</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>새 버튼 기본값</Text>
          <View style={styles.card}>
            <LoopToggle value={defaultLoop} onChange={setDefaultLoop} />
          </View>
          <View style={styles.card}>
            <VolumeSlider value={defaultVolume} onChange={setDefaultVolume} label="기본 볼륨" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>캐시 관리</Text>
          <View style={styles.card}>
            <Text style={styles.cacheInfo}>현재 캐시 용량: {formatBytes(cacheSize)}</Text>
            <Text style={styles.cacheHelper}>
              자주 재생한 음원은 기기에 저장되어, 네트워크가 불안정해도 끊김 없이 재생됩니다.
            </Text>
            <PrimaryButton label="캐시 비우기" variant="secondary" onPress={handleClearCache} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing(2.5),
    gap: theme.spacing(3),
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  section: {
    gap: theme.spacing(1.5),
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
  cacheInfo: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cacheHelper: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
