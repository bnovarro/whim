import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Venue } from '../types';
import { colors, typography, spacing, radii, shadows, activityColors } from '../theme';
import { formatDistance, formatPriceLevel } from '../utils/formatters';

interface VenueCardProps {
  venue: Venue;
  rank: number;
  onPress?: () => void;
}

const BOOKING_LABELS: Record<string, string> = {
  resy: 'Book on Resy',
  opentable: 'Book on OpenTable',
  website: 'Visit Website',
};

export default function VenueCard({ venue, rank, onPress }: VenueCardProps) {
  const gradient = activityColors[venue.activityType] || colors.gradients.primary;
  const matchColor = venue.matchScore >= 90 ? colors.success : venue.matchScore >= 75 ? colors.warning : colors.textTertiary;

  const handleBook = () => {
    if (venue.bookingUrl) Linking.openURL(venue.bookingUrl);
  };

  const handleDirections = () => {
    const query = encodeURIComponent(venue.address || venue.name);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
    );
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrapper}>
      <View style={[styles.card, venue.isAlternative && styles.alternativeCard]}>
        {venue.isAlternative && (
          <View style={styles.altBadge}>
            <Text style={styles.altBadgeText}>Alternative pick</Text>
          </View>
        )}

        <View style={styles.header}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rank}</Text>
          </LinearGradient>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{venue.name}</Text>
            <Text style={styles.neighborhood}>{venue.neighborhood} · {formatDistance(venue.distanceMiles)}</Text>
          </View>
          <View style={styles.matchScore}>
            <Text style={[styles.matchNumber, { color: matchColor }]}>{venue.matchScore}</Text>
            <Text style={styles.matchLabel}>match</Text>
          </View>
        </View>

        <Text style={styles.explanation}>{venue.matchExplanation}</Text>

        {venue.alternativeNote && (
          <View style={styles.altNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
            <Text style={styles.altNoteText}>{venue.alternativeNote}</Text>
          </View>
        )}

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={13} color={colors.warning} />
              <Text style={styles.metaText}>{venue.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.priceDot}>{formatPriceLevel(venue.priceLevel)}</Text>
            <View style={[styles.openBadge, { backgroundColor: venue.isOpenNow ? colors.success + '20' : colors.danger + '20' }]}>
              <Text style={[styles.openText, { color: venue.isOpenNow ? colors.success : colors.danger }]}>
                {venue.isOpenNow ? 'Open now' : 'Closed'}
              </Text>
            </View>
          </View>
          {venue.availabilityNote && (
            <Text style={styles.availNote}>{venue.availabilityNote}</Text>
          )}
        </View>

        {venue.tags.length > 0 && (
          <View style={styles.tags}>
            {venue.tags.slice(0, 4).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleDirections} style={styles.directionsButton} activeOpacity={0.8}>
            <Ionicons name="navigate-outline" size={15} color={colors.secondary} />
            <Text style={styles.directionsText}>Directions</Text>
          </TouchableOpacity>
          {venue.bookingUrl && (
            <TouchableOpacity onPress={handleBook} style={styles.bookButton} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              <Text style={styles.bookText}>{BOOKING_LABELS[venue.bookingPlatform || 'website']}</Text>
            </TouchableOpacity>
          )}
        </View>
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
    ...shadows.md,
  },
  alternativeCard: {
    borderColor: colors.warning + '40',
    borderStyle: 'dashed',
  },
  altBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  altBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.warning,
    fontWeight: typography.weights.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  neighborhood: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  matchScore: {
    alignItems: 'center',
  },
  matchNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    lineHeight: typography.sizes.xl * 1.1,
  },
  matchLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanation: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * 1.6,
    marginBottom: spacing.md,
  },
  altNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.warning + '10',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  altNoteText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.warning,
    lineHeight: 18,
  },
  meta: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  priceDot: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  openBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  openText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  availNote: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  tagText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  bookText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.secondary + '40',
    backgroundColor: colors.secondary + '06',
  },
  directionsText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.secondary,
  },
});
