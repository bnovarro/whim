import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SportsEvent } from '../types';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface Props {
  event: SportsEvent;
}

const NYC_TZ = 'America/New_York';

function formatGameTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', { timeZone: NYC_TZ });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', { timeZone: NYC_TZ });
  const eventStr = d.toLocaleDateString('en-US', { timeZone: NYC_TZ });

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: NYC_TZ,
  });

  if (eventStr === todayStr) return `Tonight · ${timeStr}`;
  if (eventStr === tomorrowStr) return `Tomorrow · ${timeStr}`;
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: NYC_TZ,
  }) + ` · ${timeStr}`;
}

const PLATFORM_COLORS: Record<string, string> = {
  stubhub: '#003F87',
  ticketmaster: '#026CDF',
};

export default function SportsEventCard({ event }: Props) {
  const platformColor = PLATFORM_COLORS[event.platform] || colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.matchup}>
          <Text style={styles.teams} numberOfLines={1}>
            {event.awayTeam
              ? <>{event.homeTeam} <Text style={styles.vs}>vs</Text> {event.awayTeam}</>
              : event.homeTeam}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.leagueBadge}>
              <Text style={styles.leagueText}>{event.league}</Text>
            </View>
            <Text style={styles.sport}>{event.sport}</Text>
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>from ${event.minPrice}</Text>
          <Text style={styles.priceLabel}>per ticket</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.detailText}>{formatGameTime(event.datetime)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.detailText} numberOfLines={1}>{event.venue} · {event.neighborhood}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={() => Linking.openURL(`maps://?q=${encodeURIComponent(event.address)}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={14} color={colors.secondary} />
          <Text style={styles.directionsBtnText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ticketBtn, { backgroundColor: platformColor }]}
          onPress={() => Linking.openURL(event.ticketUrl)}
          activeOpacity={0.8}
        >
          <Ionicons name="ticket-outline" size={14} color="#fff" />
          <Text style={styles.ticketBtnText}>
            {event.platform === 'stubhub' ? 'StubHub' : 'Ticketmaster'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  matchup: { flex: 1 },
  teams: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  vs: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leagueBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  leagueText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  sport: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  priceBlock: { alignItems: 'flex-end' },
  price: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  priceLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  details: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  directionsBtn: {
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
  directionsBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.secondary,
  },
  ticketBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  ticketBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
});
