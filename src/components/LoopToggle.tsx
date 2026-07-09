// 반복 재생 ON/OFF 스위치. loop=true면 음원이 끝났을 때 처음부터 자동으로 다시 재생된다.
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function LoopToggle({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>반복 재생</Text>
        <Text style={styles.helper}>
          {value ? '음원이 끝나면 처음부터 다시 재생됩니다.' : '한 번만 재생되고 멈춥니다. (효과음에 적합)'}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
