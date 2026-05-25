import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { PlanRec } from '../services/recommendationsService';
import { FriendData } from '../store/friendsStore';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface Props {
  recs: PlanRec[];
  isLoading: boolean;
  onRefresh?: () => void;
  availableFriends?: FriendData[];
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CARD_W = 168;
const CARD_H = 196;

const FRIEND_GRADS: Array<[string, string]> = [
  ['#FF6B35', '#FF3D6B'],
  ['#FF8C42', '#FF6B9D'],
  ['#F97316', '#EC4899'],
  ['#FF9A56', '#FF5E8A'],
  ['#E55A25', '#FF3D6B'],
  ['#FFAA6B', '#FF6B9D'],
  ['#FF6B6B', '#C026D3'],
];

function friendGrad(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return FRIEND_GRADS[Math.abs(h) % FRIEND_GRADS.length];
}

export default function DailyRecs({
  recs, isLoading, onRefresh, availableFriends = [],
}: Props) {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ideas for today</Text>
          <Text style={styles.subtitle}>Based on right now in NYC</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Generating ideas…</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Friend suggestion cards ── */}
          {availableFriends.map(friend => {
            const initials = friend.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const grad = friendGrad(friend.name);
            const firstName = friend.name.split(' ')[0];
            return (
              <TouchableOpacity
                key={`friend_${friend.id}`}
                activeOpacity={0.88}
                style={styles.cardWrapper}
                onPress={() => navigation.navigate('CreateWhim', {})}
              >
                <View style={[styles.card, styles.friendCard]}>
                  {/* Subtle color tint behind the card */}
                  <LinearGradient
                    colors={[grad[0] + '20', 'transparent']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.65 }}
                  />

                  {/* Avatar */}
                  <LinearGradient
                    colors={grad}
                    style={styles.friendAvatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.friendInitials}>{initials}</Text>
                  </LinearGradient>

                  {/* Name + free status */}
                  <View style={styles.friendBody}>
                    <Text style={styles.friendName} numberOfLines={1}>{firstName}</Text>
                    <View style={styles.freeRow}>
                      <View style={styles.freeDot} />
                      <Text style={styles.freeText}>Free today</Text>
                    </View>
                    <Text style={styles.friendHook} numberOfLines={2}>
                      Might be down for something spontaneous
                    </Text>
                  </View>

                  {/* CTA */}
                  <View style={styles.friendCta}>
                    <Text style={[styles.friendCtaText, { color: grad[0] }]}>Plan something?</Text>
                    <Ionicons name="arrow-forward" size={11} color={grad[0]} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* ── Plan rec cards ── */}
          {recs.map(rec => (
            <TouchableOpacity
              key={rec.id}
              activeOpacity={0.88}
              style={styles.cardWrapper}
              onPress={() => navigation.navigate('CreateWhim', {
                activityType: rec.activityType,
                vibes: rec.vibes,
              })}
            >
              <View style={styles.card}>
                {/* Top row: icon badge + neighborhood */}
                <View style={styles.cardTopRow}>
                  <LinearGradient
                    colors={colors.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBadge}
                  >
                    <Ionicons name={rec.icon as any} size={15} color={colors.textInverse} />
                  </LinearGradient>
                  {rec.neighborhood && (
                    <View style={styles.neighborhoodPill}>
                      <Ionicons name="location-outline" size={9} color={colors.textTertiary} />
                      <Text style={styles.neighborhoodText} numberOfLines={1}>{rec.neighborhood}</Text>
                    </View>
                  )}
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{rec.title}</Text>
                  <Text style={styles.cardHook} numberOfLines={3}>{rec.hook}</Text>
                </View>

                {/* CTA */}
                <View style={styles.cardCta}>
                  <Text style={styles.cardCtaText}>Start a Whim</Text>
                  <Ionicons name="arrow-forward" size={11} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.base,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Shared card wrapper
  cardWrapper: {
    borderRadius: radii.xl,
    ...shadows.md,
    overflow: 'visible',
    backgroundColor: colors.surface,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  // ── Friend card ──────────────────────────────────────────────────────────────
  friendCard: {
    borderColor: 'transparent',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitials: {
    fontSize: 18,
    fontWeight: typography.weights.heavy,
    color: '#fff',
    letterSpacing: -0.3,
  },
  friendBody: {
    flex: 1,
    marginTop: spacing.sm,
    gap: 3,
  },
  friendName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.3,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  freeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  freeText: {
    fontSize: 11,
    color: '#22C55E',
    fontWeight: typography.weights.semibold,
  },
  friendHook: {
    fontSize: 10,
    color: colors.textTertiary,
    lineHeight: 14,
    marginTop: 2,
  },
  friendCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  friendCtaText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Plan rec card ─────────────────────────────────────────────────────────────
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 34, height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neighborhoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    maxWidth: 90,
  },
  neighborhoodText: {
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 0.1,
  },
  cardBody: {
    gap: 5,
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  cardHook: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardCtaText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
