import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FlightDeal } from '../types';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { formatPrice, formatSavings, formatTripLength } from '../utils/formatters';
import { formatFlightDate } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

interface FlightDealCardProps {
  deal: FlightDeal;
  onPress: () => void;
  compact?: boolean;
}

export default function FlightDealCard({ deal, onPress, compact = false }: FlightDealCardProps) {
  const cheapestDep = deal.departureDates.reduce((min, d) => d.price < min.price ? d : min, deal.departureDates[0]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[styles.wrapper, compact && styles.compactWrapper]}>
      <LinearGradient
        colors={deal.destination.imageGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, compact && styles.compactCard]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.savingsBadge}>
          <Ionicons name="trending-down" size={12} color={colors.textInverse} />
          <Text style={styles.savingsText}>{formatSavings(deal.savingsPercent)}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.locationRow}>
            <Text style={styles.city}>{deal.destination.city}</Text>
            <Text style={styles.country}>{deal.destination.country}</Text>
          </View>

          {!compact && (
            <>
              <Text style={styles.description} numberOfLines={2}>{deal.destination.description}</Text>
              {deal.whyNow && (
                <View style={styles.whyNowBadge}>
                  <Ionicons name="sparkles" size={11} color="rgba(255,255,255,0.95)" />
                  <Text style={styles.whyNowText} numberOfLines={2}>{deal.whyNow}</Text>
                </View>
              )}
            </>
          )}

          <View style={styles.footer}>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatPrice(deal.price)}</Text>
              <Text style={styles.priceLabel}>from JFK · avg {formatPrice(deal.averagePrice)}</Text>
            </View>

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{formatFlightDate(cheapestDep.date)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{formatTripLength(deal.tripLength.min, deal.tripLength.max)}</Text>
              </View>
            </View>
          </View>

          {!compact && deal.tags.length > 0 && (
            <View style={styles.tags}>
              {deal.tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radii['2xl'],
    ...shadows.lg,
  },
  compactWrapper: {
    marginHorizontal: 0,
    width: width * 0.65,
  },
  card: {
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    height: 220,
    padding: spacing.base,
    justifyContent: 'space-between',
  },
  compactCard: {
    height: 180,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  savingsText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  content: {
    gap: spacing.sm,
  },
  locationRow: {
    gap: spacing.xs,
  },
  city: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
    lineHeight: typography.sizes['2xl'] * 1.1,
  },
  country: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.weights.medium,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: typography.sizes.sm * 1.5,
  },
  whyNowBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  whyNowText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 15,
    fontWeight: '500' as const,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceBlock: {
    gap: 2,
  },
  price: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  priceLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  meta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.weights.medium,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: typography.weights.medium,
  },
});
