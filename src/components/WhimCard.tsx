import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Whim } from '../types';
import { colors, typography, spacing, radii, shadows, activityColors, activityIcons } from '../theme';
import { formatWhimTime, formatRelativeDate } from '../utils/dateUtils';
import { formatGroupSize } from '../utils/formatters';

interface WhimCardProps {
  whim: Whim;
  onPress: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  drafting: 'Setting up',
  searching: 'Searching...',
  found: 'Spots found',
  confirmed: 'Locked in',
  completed: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  drafting: colors.textTertiary,
  searching: colors.warning,
  found: colors.success,
  confirmed: colors.primary,
  completed: colors.textTertiary,
  cancelled: colors.danger,
};

export default function WhimCard({ whim, onPress }: WhimCardProps) {
  const gradient = activityColors[whim.params.activityType] || colors.gradients.primary;
  const emoji = activityIcons[whim.params.activityType];
  const confirmedCount = whim.attendees.filter(a => a.status === 'confirmed').length;
  const statusColor = STATUS_COLORS[whim.status] || colors.textTertiary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBadge}>
            <Ionicons name={emoji as any} size={22} color={colors.textInverse} />
          </LinearGradient>
          <View style={styles.headerText}>
            {whim.params.planName ? (
              <Text style={styles.planName} numberOfLines={1}>{whim.params.planName}</Text>
            ) : null}
            <Text style={[styles.activityType, whim.params.planName ? styles.activityTypeSecondary : null]}>
              {whim.params.activityType === 'watch_sports' ? 'Watch Sports' :
               whim.params.activityType === 'sports' ? 'Live Events' :
               whim.params.activityType.charAt(0).toUpperCase() + whim.params.activityType.slice(1)}
            </Text>
            <Text style={styles.timeLabel}>{formatWhimTime(whim.params.timeStart, whim.params.timeEnd)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[whim.status]}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.metaText}>{formatGroupSize(whim.params.groupSize)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.metaText}>{whim.params.radiusMiles} mi</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="checkmark-circle-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.metaText}>{confirmedCount} in</Text>
            </View>
            <Text style={styles.timeAgo}>{formatRelativeDate(whim.createdAt)}</Text>
          </View>
        </View>

        {whim.params.vibes.length > 0 && (
          <View style={styles.vibes}>
            {whim.params.vibes.slice(0, 3).map(v => (
              <View key={v} style={styles.vibe}>
                <Text style={styles.vibeText}>{v.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  planName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activityType: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activityTypeSecondary: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  timeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  meta: {
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  timeAgo: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },
  vibes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  vibe: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  vibeText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});
