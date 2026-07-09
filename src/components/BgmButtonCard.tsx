// 수업 중 빠르게 누를 수 있도록 크고 명확하게 디자인된 BGM 버튼 카드.
// 짧게 누르면 재생, 길게 누르면 수정 화면으로 이동한다.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { BgmButton } from '../types';

interface Props {
  button: BgmButton;
  isActive: boolean; // 현재 이 버튼의 음원이 재생 큐에 로드되어 있는지
  isPlaying: boolean; // 그 중에서도 실제로 소리가 나오고 있는지
  onPress: () => void;
  onLongPress: () => void;
}

export function BgmButtonCard({ button, isActive, isPlaying, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: button.color },
        isActive && styles.activeCard,
        pressed && styles.pressed,
      ]}
    >
      {isActive && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{isPlaying ? '재생 중' : '일시정지'}</Text>
        </View>
      )}
      <Text style={styles.icon}>{button.icon}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {button.title}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.category} numberOfLines={1}>
          {button.category}
        </Text>
        {button.loop && <Text style={styles.loopBadge}>🔁 반복</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 140,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    justifyContent: 'flex-end',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: theme.colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
  statusBadge: {
    position: 'absolute',
    top: theme.spacing(1.5),
    right: theme.spacing(1.5),
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 999,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  icon: {
    fontSize: 32,
    marginBottom: theme.spacing(1),
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: theme.spacing(0.5),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  category: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  loopBadge: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
});
