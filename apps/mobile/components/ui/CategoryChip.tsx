import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  selected = false,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.selectedChip : styles.defaultChip,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected ? styles.selectedLabel : styles.defaultLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  defaultChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  selectedChip: {
    backgroundColor: '#6F9A78', // sage-500
    borderWidth: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  defaultLabel: {
    color: '#2B2F2D', // ink-700
  },
  selectedLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
