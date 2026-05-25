import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';

interface AgentSearchingProps {
  message: string;
}

export default function AgentSearching({ message }: AgentSearchingProps) {
  const pulse1 = useRef(new Animated.Value(0.4)).current;
  const pulse2 = useRef(new Animated.Value(0.4)).current;
  const pulse3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const dot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    const a1 = dot(pulse1, 0);
    const a2 = dot(pulse2, 200);
    const a3 = dot(pulse3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconRing}>
        <Ionicons name="search" size={28} color={colors.textInverse} />
      </LinearGradient>
      <View style={styles.dotsRow}>
        {[pulse1, pulse2, pulse3].map((anim, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
        ))}
      </View>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subtext}>This usually takes a few seconds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.base,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  message: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: typography.sizes.md * 1.5,
  },
  subtext: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
});
