import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Linking, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';

import { RootStackParamList } from '../navigation/types';
import { usePublicPlansStore } from '../store/publicPlansStore';
import { useFriendsStore, FriendData } from '../store/friendsStore';
import { DayAvailability, AvailabilityVisibility } from '../types';
import {
  colors, typography, spacing, radii, shadows,
  activityIcons, planTypeConfig, cuisineLabels, drinkTypeLabels,
} from '../theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_H = 300;
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRAD_POOL: Array<[string, string]> = [
  ['#FF6B35', '#FF3D6B'],   // orange → rose
  ['#FF8C42', '#FF6B9D'],   // amber → pink
  ['#F97316', '#EC4899'],   // warm orange → magenta pink
  ['#FF9A56', '#FF5E8A'],   // peach → warm rose
  ['#E55A25', '#FF3D6B'],   // deep orange → hot rose
  ['#FFAA6B', '#FF6B9D'],   // light peach → soft pink
  ['#FF6B6B', '#C026D3'],   // coral → violet
];

function nameGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRAD_POOL[Math.abs(hash) % GRAD_POOL.length];
}

function planSubLabel(plan: { activityType: string; cuisine?: string; barType?: string }): string {
  if (plan.activityType === 'dinner' && plan.cuisine)
    return cuisineLabels[plan.cuisine as keyof typeof cuisineLabels] ?? plan.cuisine;
  if (plan.activityType === 'drinks' && plan.barType)
    return drinkTypeLabels[plan.barType as keyof typeof drinkTypeLabels] ?? plan.barType;
  if (plan.activityType === 'watch_sports') return 'Watch Sports';
  if (plan.activityType === 'sports') return 'Live Events';
  return plan.activityType.charAt(0).toUpperCase() + plan.activityType.slice(1);
}

function getWeekDayLetters(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return DAY_LETTERS[d.getDay()];
  });
}

function availSummary(avail: DayAvailability[]): { text: string; color: string } {
  const free = avail.filter(d => d === 'free').length;
  const known = avail.filter(d => d !== 'unknown').length;
  if (known === 0) return { text: 'Availability not shared', color: colors.textTertiary };
  if (free >= 5) return { text: 'Mostly free this week', color: '#22C55E' };
  if (free >= 3) return { text: 'Somewhat available this week', color: '#F59E0B' };
  if (free >= 1) return { text: 'Mostly busy this week', color: colors.primary };
  return { text: 'Busy this week', color: colors.primary };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type RouteParams = RouteProp<RootStackParamList, 'UserProfile'>;

/** Swipeable photo gallery with dot indicator */
function PhotoGallery({ photos }: { photos: string[] }) {
  const [page, setPage] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPage(newPage);
  };

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {photos.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: SCREEN_W, height: PHOTO_H, resizeMode: 'cover' }}
          />
        ))}
      </ScrollView>

      {/* Dot indicator */}
      {photos.length > 1 && (
        <View style={styles.galleryDots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.galleryDot, i === page && styles.galleryDotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Week availability calendar */
function WeekCalendar({ weekAvail }: { weekAvail: DayAvailability[] }) {
  const dayLetters = getWeekDayLetters();
  const colW = (SCREEN_W - spacing.base * 2 - spacing.base * 2) / 7; // account for card + screen padding

  return (
    <View style={styles.weekCalRow}>
      {dayLetters.map((letter, idx) => {
        const avail = weekAvail[idx] ?? 'unknown';
        const isToday = idx === 0;
        return (
          <View key={idx} style={[styles.weekCol, { width: colW }]}>
            <Text style={[styles.weekDayLetter, isToday && styles.weekDayLetterToday]}>
              {letter}
            </Text>
            <View style={[
              styles.weekDot,
              avail === 'free' ? styles.weekDotFree :
              avail === 'busy' ? styles.weekDotBusy :
              styles.weekDotUnknown,
            ]} />
            {isToday && <Text style={styles.todayLabel}>Today</Text>}
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { userId, name: paramName, photo: paramPhoto, instagram: paramInstagram } = route.params;

  // Look up friends store — rich data if they're a friend
  const { friends, sentRequests, sendFriendRequest } = useFriendsStore();
  const friend: FriendData | undefined = friends.find(f => f.id === userId);
  const isFriend = !!friend;
  const requestSent = sentRequests.includes(userId);

  // Merge friend data with nav params
  const displayName     = friend?.name      ?? paramName;
  const displayPhoto    = friend?.photo     ?? paramPhoto;
  const displayInstagram = friend?.instagram ?? paramInstagram;
  const displayBio      = friend?.bio;
  const displayPhotos   = friend?.photos ?? (displayPhoto ? [displayPhoto] : []);

  const showAvailability =
    !!friend && friend.availabilityVisibility !== 'private';

  const { plans } = usePublicPlansStore();
  // Only show public plans — exclusive_date plans are private
  const theirPublicPlans = plans.filter(
    p => p.creatorId === userId && p.visibility === 'public'
  );

  // For non-friends: show simple "available today" indicator if their visibility is public
  const today = new Date().toISOString().slice(0, 10);
  const planCreatorVisibility: AvailabilityVisibility =
    plans.find(p => p.creatorId === userId)?.creatorAvailabilityVisibility ?? 'private';
  const hasPlanToday = theirPublicPlans.some(p => p.date === today);
  const showSimpleAvail = !friend && planCreatorVisibility === 'public';

  const firstName = displayName.split(' ')[0];
  const initials  = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const grad      = nameGradient(displayName);

  const hasPhotos = displayPhotos.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav bar (floats over header) */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={hasPhotos ? colors.textInverse : colors.text} />
        </TouchableOpacity>
        {!hasPhotos && <Text style={styles.navTitle}>{firstName}</Text>}
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Header: photo gallery OR gradient avatar ── */}
        {hasPhotos ? (
          <View style={{ marginTop: -56 }}>
            <PhotoGallery photos={displayPhotos} />
            {/* Gradient overlay for name */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={styles.photoOverlay}
            >
              <Text style={styles.photoName}>{displayName}</Text>
              {displayInstagram ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://instagram.com/${displayInstagram}`)}
                  style={styles.photoIgRow}
                >
                  <Ionicons name="logo-instagram" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.photoIgText}>@{displayInstagram}</Text>
                </TouchableOpacity>
              ) : null}
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={grad}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarInitials}>{initials}</Text>
            </LinearGradient>
            <Text style={styles.nameText}>{displayName}</Text>
            {displayInstagram ? (
              <TouchableOpacity
                style={styles.igChip}
                onPress={() => Linking.openURL(`https://instagram.com/${displayInstagram}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-instagram" size={14} color={colors.primary} />
                <Text style={styles.igText}>@{displayInstagram}</Text>
                <Ionicons name="open-outline" size={12} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── Bio ── */}
        {displayBio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{displayBio}</Text>
          </View>
        ) : null}

        {/* ── Instagram (if photo header hides the chip) ── */}
        {hasPhotos && displayInstagram ? (
          <TouchableOpacity
            style={styles.igChipStandalone}
            onPress={() => Linking.openURL(`https://instagram.com/${displayInstagram}`)}
            activeOpacity={0.75}
          >
            <Ionicons name="logo-instagram" size={14} color={colors.primary} />
            <Text style={styles.igText}>@{displayInstagram}</Text>
            <Ionicons name="open-outline" size={12} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}

        {/* ── Friend request button (non-friends only) ── */}
        {!isFriend && (
          <View style={styles.friendReqWrap}>
            {requestSent ? (
              <View style={styles.friendReqSent}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.friendReqSentText}>Friend request sent</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.friendReqBtn}
                onPress={() => sendFriendRequest(userId)}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.textInverse} />
                <Text style={styles.friendReqBtnText}>Add Friend</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Simple availability for public non-friends ── */}
        {showSimpleAvail && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AVAILABILITY</Text>
            <View style={styles.simpleAvailCard}>
              <View style={[
                styles.availDot,
                { backgroundColor: hasPlanToday ? colors.primary : '#22C55E' },
              ]} />
              <Text style={[
                styles.availSummaryText,
                { color: hasPlanToday ? colors.primary : '#22C55E' },
              ]}>
                {hasPlanToday ? 'Has plans today' : 'Available today'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Availability section ── */}
        {showAvailability && friend ? (() => {
          const summary = availSummary(friend.weekAvailability);
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AVAILABILITY</Text>
              <View style={styles.availCard}>
                {/* Summary row */}
                <View style={styles.availSummaryRow}>
                  <View style={[styles.availDot, { backgroundColor: summary.color }]} />
                  <Text style={[styles.availSummaryText, { color: summary.color }]}>
                    {summary.text}
                  </Text>
                </View>

                {/* 7-day calendar */}
                <WeekCalendar weekAvail={friend.weekAvailability} />

                {/* Legend */}
                <View style={styles.availLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={styles.legendText}>Free</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Has plans</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.borderLight }]} />
                    <Text style={styles.legendText}>Unknown</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })() : null}

        {/* ── Public Plans ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{firstName.toUpperCase()}'S PLANS</Text>

          {theirPublicPlans.length === 0 ? (
            <View style={styles.emptyPlans}>
              <Ionicons name="calendar-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.emptyPlansText}>No public plans yet</Text>
            </View>
          ) : (
            <View style={styles.plansList}>
              {theirPublicPlans.map(plan => {
                const cfg  = planTypeConfig[plan.planType];
                const icon = activityIcons[plan.activityType] ?? 'flash-outline';
                const sub  = planSubLabel(plan);
                return (
                  <View key={plan.id} style={styles.planCard}>
                    <LinearGradient
                      colors={cfg.gradient}
                      style={styles.planIconBg}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={icon as any} size={16} color={colors.textInverse} />
                    </LinearGradient>

                    <View style={styles.planInfo}>
                      <Text style={styles.planName} numberOfLines={1}>{plan.planName}</Text>
                      <Text style={styles.planSub} numberOfLines={1}>
                        {sub} · {plan.neighborhood}
                      </Text>
                      <View style={styles.planMeta}>
                        <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
                        <Text style={styles.planMetaText}>{plan.timeStart}</Text>
                        <Text style={styles.planMetaDot}>·</Text>
                        <Text style={styles.planMetaText}>
                          {plan.attendeeCount} going
                        </Text>
                        <Text style={styles.planMetaDot}>·</Text>
                        <Text style={styles.planMetaText}>
                          {formatDistanceToNow(new Date(plan.createdAt), { addSuffix: true })}
                        </Text>
                      </View>
                    </View>

                    {/* Plan type badge dot */}
                    <LinearGradient
                      colors={cfg.gradient}
                      style={styles.planTypeDot}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Nav bar
  navBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  navTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },

  content: { paddingBottom: spacing['4xl'] },

  // Photo header
  photoOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 100,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: 4,
  },
  photoName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
    letterSpacing: -0.5,
  },
  photoIgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoIgText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.weights.medium,
  },

  // Gallery dots
  galleryDots: {
    position: 'absolute',
    bottom: spacing.base + 32,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  galleryDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  galleryDotActive: {
    backgroundColor: colors.textInverse,
    width: 18,
  },

  // Gradient avatar fallback
  avatarSection: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  avatar: {
    width: 96, height: 96,
    borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarInitials: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  nameText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.4,
  },
  igChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.primary + '0E',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  igChipStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.primary + '0E',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  igText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // Friend request
  friendReqWrap: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  friendReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
  },
  friendReqBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  friendReqSent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '14',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.success + '40',
    paddingVertical: spacing.md,
  },
  friendReqSentText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },

  // Simple availability card (non-friends with public visibility)
  simpleAvailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    ...shadows.sm,
  },

  // Bio
  bioCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
  },
  bioText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: typography.sizes.base * 1.55,
  },

  // Section
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },

  // Availability card
  availCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.base,
    ...shadows.sm,
  },
  availSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  availDot: {
    width: 10, height: 10,
    borderRadius: 5,
  },
  availSummaryText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  // Week calendar
  weekCalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekCol: {
    alignItems: 'center',
    gap: 5,
  },
  weekDayLetter: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  weekDayLetterToday: {
    color: colors.primary,
    fontWeight: typography.weights.heavy,
  },
  weekDot: {
    width: 22, height: 22,
    borderRadius: 11,
  },
  weekDotFree: { backgroundColor: '#22C55E' },
  weekDotBusy: { backgroundColor: colors.primary },
  weekDotUnknown: { backgroundColor: colors.borderLight },
  todayLabel: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Availability legend
  availLegend: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8, height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },

  // Plans list
  plansList: { gap: spacing.sm },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  planIconBg: {
    width: 42, height: 42,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planInfo: { flex: 1 },
  planName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  planSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  planMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  planMetaDot: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  planTypeDot: {
    width: 10, height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },

  // Empty plans
  emptyPlans: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyPlansText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
