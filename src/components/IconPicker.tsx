// 버튼 추가/수정 화면에서 버튼 아이콘(이모지)을 고르는 그리드.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BUTTON_ICONS } from '../constants/buttonOptions';
import { theme } from '../constants/theme';

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {BUTTON_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => onChange(icon)}
            style={[styles.cell, selected && styles.selected]}
          >
            <Text style={styles.icon}>{icon}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  cell: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  icon: {
    fontSize: 22,
  },
});
