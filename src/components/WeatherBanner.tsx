import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WeatherAlert } from '../types';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface WeatherBannerProps {
  alert: WeatherAlert;
  onAction: () => void;
  onDismiss: () => void;
}

const ALERT_GRADIENTS: Record<string, [string, string]> = {
  great_weather: ['#F59E0B', '#FF8C42'],   // warm amber — sunny day
  bad_weather: ['#4b6cb7', '#182848'],
  seasonal: ['#FF6B35', '#FF9A56'],
  escape_nudge: ['#C44D56', '#FF6B35'],    // sunset
};

const ALERT_ICONS: Record<string, string> = {
  great_weather: 'sunny',
  bad_weather: 'rainy',
  seasonal: 'leaf',
  escape_nudge: 'airplane',
};

export default function WeatherBanner({ alert, onAction, onDismiss }: WeatherBannerProps) {
  const gradient = ALERT_GRADIENTS[alert.type] || colors.gradients.primary;
  const icon = ALERT_ICONS[alert.type] || 'notifications';

  return (
    <TouchableOpacity onPress={onAction} activeOpacity={0.9} style={styles.wrapper}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={22} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{alert.message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radii.xl,
    ...shadows.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radii.xl,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    marginBottom: 2,
  },
  message: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },
});
