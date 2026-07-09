// 현재 재생 중인 음원을 보여주는 하단 바. 아무것도 재생 중이 아니면 렌더링하지 않는다.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { BgmButton } from '../types';

interface Props {
  activeButton: BgmButton | null;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onStop: () => void;
}

export function PlayerBar({ activeButton, isPlaying, onTogglePlayPause, onStop }: Props) {
  if (!activeButton) return null;

  return (
    <View style={[styles.bar, { borderColor: activeButton.color }]}>
      <Text style={styles.icon}>{activeButton.icon}</Text>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {activeButton.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {activeButton.category} {activeButton.loop ? '· 🔁 반복 재생' : ''}
        </Text>
      </View>
      <Pressable onPress={onTogglePlayPause} style={styles.iconButton}>
        <Text style={styles.iconButtonLabel}>{isPlaying ? '⏸' : '▶️'}</Text>
      </Pressable>
      <Pressable onPress={onStop} style={styles.iconButton}>
        <Text style={styles.iconButtonLabel}>⏹</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    padding: theme.spacing(1.5),
    gap: theme.spacing(1.5),
  },
  icon: {
    fontSize: 26,
  },
  info: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonLabel: {
    fontSize: 16,
  },
});
