// 등록된 BGM 버튼이 하나도 없을 때 HomeScreen에 보여주는 안내 화면.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎵</Text>
      <Text style={styles.title}>등록된 BGM 버튼이 없어요</Text>
      <Text style={styles.subtitle}>오른쪽 아래 + 버튼을 눌러 첫 BGM 버튼을 추가해보세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(8),
  },
  emoji: {
    fontSize: 48,
    marginBottom: theme.spacing(2),
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
