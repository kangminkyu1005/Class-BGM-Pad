// BGM 버튼 목록 화면 (앱의 메인 화면).
// - Firestore에서 실시간으로 버튼 목록을 불러와 카드 그리드로 보여준다.
// - 카드를 누르면 재생, 길게 누르거나 연필 아이콘을 누르면 수정 화면으로 이동한다.
// - 카테고리 필터, 재생 중 표시(PlayerBar), 전체 정지 버튼, 버튼 추가 FAB을 포함한다.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BgmButtonCard } from '../components/BgmButtonCard';
import { ALL_CATEGORY, CategoryFilter } from '../components/CategoryFilter';
import { EmptyState } from '../components/EmptyState';
import { PlayerBar } from '../components/PlayerBar';
import { StopAllButton } from '../components/StopAllButton';
import { theme } from '../constants/theme';
import { usePlayer } from '../context/PlayerContext';
import { useBgmButtons } from '../hooks/useBgmButtons';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { buttons, loading, error } = useBgmButtons();
  const { activeButtonId, isPlaying, isBusy, play, pause, resume, stopAll } = usePlayer();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);

  const categories = useMemo(
    () => Array.from(new Set(buttons.map((b) => b.category))).sort(),
    [buttons]
  );

  const visibleButtons = useMemo(
    () =>
      selectedCategory === ALL_CATEGORY
        ? buttons
        : buttons.filter((b) => b.category === selectedCategory),
    [buttons, selectedCategory]
  );

  const activeButton = useMemo(
    () => buttons.find((b) => b.id === activeButtonId) ?? null,
    [buttons, activeButtonId]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>Class BGM Pad</Text>
        <Pressable onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
          <Text style={styles.headerButtonLabel}>⚙️</Text>
        </Pressable>
      </View>

      {categories.length > 0 && (
        <View style={styles.filterWrap}>
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>목록을 불러오지 못했습니다.{'\n'}{error}</Text>
        </View>
      ) : buttons.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {visibleButtons.map((button) => (
            <BgmButtonCard
              key={button.id}
              button={button}
              isActive={button.id === activeButtonId}
              isPlaying={button.id === activeButtonId && isPlaying}
              onPress={() => play(button)}
              onEdit={() => navigation.navigate('EditButton', { button })}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <PlayerBar
          activeButton={activeButton}
          isPlaying={isPlaying}
          onTogglePlayPause={() => (isPlaying ? pause() : resume())}
          onStop={stopAll}
        />
        <StopAllButton onPress={stopAll} disabled={!activeButtonId || isBusy} />
      </View>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('AddButton')}>
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1),
  },
  appTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  headerButton: {
    padding: theme.spacing(1),
  },
  headerButtonLabel: {
    fontSize: 22,
  },
  filterWrap: {
    paddingHorizontal: theme.spacing(2),
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(3),
  },
  errorText: {
    color: theme.colors.danger,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(4),
  },
  footer: {
    paddingHorizontal: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
  fab: {
    position: 'absolute',
    right: theme.spacing(2.5),
    bottom: theme.spacing(18),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabLabel: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: -2,
  },
});
