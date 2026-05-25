import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function Chip({ label, selected = false, onPress, style, disabled = false }: ChipProps) {
  const handlePress = () => {
    if (disabled || !onPress) return;
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled, style]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  selected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  selectedLabel: {
    color: colors.textInverse,
  },
});
