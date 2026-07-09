// 버튼 추가/수정 화면에서 버튼 색상을 고르는 스와치 목록.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BUTTON_COLORS } from '../constants/buttonOptions';
import { theme } from '../constants/theme';

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {BUTTON_COLORS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            style={[styles.swatch, { backgroundColor: color }, selected && styles.selected]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: theme.colors.text,
  },
});
