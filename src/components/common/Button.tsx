import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii, shadows } from '../../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export default function Button({
  label, onPress, variant = 'primary', size = 'md', loading = false, disabled = false, style, textStyle, fullWidth = false,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyles = sizes[size];
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={isDisabled ? [colors.border, colors.border] : colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, sizeStyles.container, !isDisabled && shadows.md]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={[styles.primaryText, sizeStyles.text, textStyle]}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        sizeStyles.container,
        variantStyles[variant],
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : colors.text} size="small" />
      ) : (
        <Text style={[styles.text, variantTextStyles[variant], sizeStyles.text, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  primaryText: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
  text: { fontWeight: typography.weights.semibold },
  disabled: { opacity: 0.45 },
});

const variantStyles: Record<string, ViewStyle> = {
  secondary: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
};

const variantTextStyles: Record<string, TextStyle> = {
  secondary: { color: colors.text },
  ghost: { color: colors.primary },
  danger: { color: colors.textInverse },
};

const sizes = {
  sm: {
    container: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md } as ViewStyle,
    text: { fontSize: typography.sizes.sm } as TextStyle,
  },
  md: {
    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl } as ViewStyle,
    text: { fontSize: typography.sizes.base } as TextStyle,
  },
  lg: {
    container: { paddingVertical: spacing.base + 2, paddingHorizontal: spacing['2xl'] } as ViewStyle,
    text: { fontSize: typography.sizes.md } as TextStyle,
  },
};
