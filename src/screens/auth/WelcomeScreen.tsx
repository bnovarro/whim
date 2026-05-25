import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, typography, spacing } from '../../theme';

const { height } = Dimensions.get('window');

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'> };

const TEASERS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'wine-outline', text: 'Rooftop drinks tonight?' },
  { icon: 'people-outline', text: 'Who\'s free right now?' },
  { icon: 'sunny-outline', text: '78° Saturday. Make a plan.' },
  { icon: 'restaurant-outline', text: 'New ramen spot. Tonight at 6.' },
];

export default function WelcomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#FF9A56', '#FFC08A', '#F8F7F4']}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.top}>
            <Text style={styles.wordmark}>Whim</Text>
            <Text style={styles.tagline}>Life's too short for boring plans.</Text>
          </View>

          <View style={styles.teasers}>
            {TEASERS.map((t, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.teaser,
                  i % 2 === 1 && styles.teaserRight,
                  { opacity: fadeAnim, transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + i * 0.3)) }] },
                ]}
              >
                <Ionicons name={t.icon} size={18} color={colors.secondary} />
                <Text style={styles.teaserText}>{t.text}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Auth', { mode: 'signup' })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Auth', { mode: 'login' })}
              activeOpacity={0.7}
            >
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Sign in</Text></Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    justifyContent: 'space-between',
    paddingTop: height * 0.08,
    paddingBottom: spacing['2xl'],
  },
  top: { gap: spacing.md },
  wordmark: {
    fontSize: 56,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: typography.sizes.lg,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.lg * 1.4,
  },
  teasers: {
    gap: spacing.md,
  },
  teaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
    maxWidth: '75%',
  },
  teaserRight: {
    alignSelf: 'flex-end',
  },
  teaserText: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  buttons: {
    gap: spacing.base,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 18,
    paddingVertical: spacing.base + 2,
    paddingHorizontal: spacing['2xl'],
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  loginText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  loginLink: {
    fontWeight: typography.weights.semibold,
    color: colors.secondary,
  },
});
