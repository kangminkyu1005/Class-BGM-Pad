// 0~100% 볼륨을 조절하는 슬라이더 + 현재 값 표시.
import React from 'react';
import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  value: number; // 0 ~ 1
  onChange: (value: number) => void;
  label?: string;
}

export function VolumeSlider({ value, onChange, label = '기본 볼륨' }: Props) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{Math.round(value * 100)}%</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.border}
        thumbTintColor={theme.colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(0.5),
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});
