import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, isSameDay,
} from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { useWhimStore } from '../store/whimStore';
import { usePublicPlansStore } from '../store/publicPlansStore';
import { useAuthStore } from '../store/authStore';
import { useWeather } from '../hooks/useWeather';
import { useLocation } from '../hooks/useLocation';
import { colors, typography, spacing, radii, shadows, activityColors, activityIcons, planTypeConfig, getWeatherBg } from '../theme';
import GradientBackground from '../components/GradientBackground';
import { weatherIcon } from '../utils/formatters';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { whims } = useWhimStore();
  const { plans: publicPlans } = usePublicPlansStore();
  const { user } = useAuthStore();
  const { lat, lon } = useLocation();
  const { weather } = useWeather(lat ?? undefined, lon ?? undefined);

  // Plans the current user created or joined
  const myPublicPlans = publicPlans.filter(p =>
    p.creatorId === user?.id || p.isJoined
  );

  // Build forecast map keyed by 'yyyy-MM-dd'
  const forecastMap: Record<string, { icon: string; high: number; isGood: boolean }> = {};
  if (weather?.forecast) {
    weather.forecast.forEach(day => {
      forecastMap[day.date] = {
        icon: weatherIcon(day.description),
        high: day.tempHigh,
        isGood: day.isGoodWeather,
      };
    });
  }

  // Build calendar grid starting from Sunday of the week containing monthStart
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calDays: Date[] = [];
  let cursor = calStart;
  while (cursor <= calEnd) {
    calDays.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < calDays.length; i += 7) {
    weeks.push(calDays.slice(i, i + 7));
  }

  const whimsOnSelected = whims.filter(w => {
    if (w.status === 'cancelled' || w.status === 'completed') return false;
    const dateStr = w.params.whimDate ?? format(new Date(w.createdAt), 'yyyy-MM-dd');
    return dateStr === format(selectedDate, 'yyyy-MM-dd');
  });

  const publicPlansOnSelected = myPublicPlans.filter(p =>
    p.date === format(selectedDate, 'yyyy-MM-dd')
  );

  const hasAnyPlanOnDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const hasWhim = whims.some(w =>
      w.status !== 'cancelled' && w.status !== 'completed' &&
      (w.params.whimDate ?? format(new Date(w.createdAt), 'yyyy-MM-dd')) === dayStr
    );
    const hasPub = myPublicPlans.some(p => p.date === dayStr);
    return hasWhim || hasPub;
  };

  const heroBg = getWeatherBg(
    weather?.current.description ?? '',
    weather?.current.isGoodWeather ?? true,
    new Date().getHours(),
  );

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground />
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
          <TouchableOpacity
            style={styles.todayChip}
            onPress={() => { setSelectedDate(new Date()); setViewMonth(new Date()); }}
          >
            <Text style={styles.todayChipText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* ── Month nav ── */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => setViewMonth(m => subMonths(m, 1))}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            onPress={() => setViewMonth(m => addMonths(m, 1))}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Calendar card ── */}
        <View style={styles.calCard}>
          {/* Day-of-week headers */}
          <View style={styles.dowRow}>
            {DOW.map(d => (
              <Text key={d} style={styles.dowLabel}>{d[0]}</Text>
            ))}
          </View>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, viewMonth);
                const isSelected = isSameDay(day, selectedDate);
                const todayDay = isToday(day);
                const fc = forecastMap[dateKey];
                const isGoodWeatherDay = inMonth && !isSelected && !todayDay && !!fc?.isGood;
                const hasPlans = inMonth && hasAnyPlanOnDay(day);

                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={[
                      styles.dayCell,
                      !inMonth && styles.dayCellFaded,
                      isGoodWeatherDay && styles.dayCellGoodWeather,
                      todayDay && !isSelected && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => { setSelectedDate(day); if (!inMonth) setViewMonth(day); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNum,
                      !inMonth && styles.dayNumFaded,
                      todayDay && !isSelected && styles.dayNumToday,
                      isSelected && styles.dayNumSelected,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                    {fc && inMonth ? (
                      <Ionicons
                        name={fc.icon as any}
                        size={9}
                        color={isSelected ? 'rgba(255,255,255,0.7)' : colors.textTertiary}
                      />
                    ) : <View style={{ height: 9 }} />}
                    {hasPlans ? (
                      <View style={[styles.planDot, isSelected && styles.planDotSelected]} />
                    ) : <View style={{ height: 4 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Plans for selected day ── */}
        <View style={styles.plansSection}>
          <Text style={styles.plansSectionTitle}>
            {isToday(selectedDate)
              ? `Today · ${format(selectedDate, 'MMMM d')}`
              : format(selectedDate, 'EEEE, MMMM d')}
          </Text>

          {whimsOnSelected.length === 0 && publicPlansOnSelected.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No plans for this day</Text>
              <Text style={styles.emptySubtext}>Start a whim or post a plan to add one.</Text>
            </View>
          ) : (
            <>
              {whimsOnSelected.map(whim => {
                const icon = activityIcons[whim.params.activityType];
                const activityLabel =
                  whim.params.activityType === 'watch_sports' ? 'Watch Sports'
                    : whim.params.activityType === 'sports' ? 'Live Events'
                      : whim.params.activityType.charAt(0).toUpperCase() + whim.params.activityType.slice(1);
                return (
                  <View key={whim.id} style={styles.planCard}>
                    <LinearGradient
                      colors={colors.gradients.primary}
                      style={styles.planIconBg}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={icon as any} size={16} color={colors.textInverse} />
                    </LinearGradient>
                    <View style={styles.planInfo}>
                      {whim.params.planName ? (
                        <Text style={styles.planName} numberOfLines={1}>{whim.params.planName}</Text>
                      ) : null}
                      <Text style={[styles.planType, whim.params.planName ? styles.planTypeSecondary : null]}>
                        {activityLabel}
                      </Text>
                      <Text style={styles.planTime}>
                        {whim.params.timeStart} – {whim.params.timeEnd}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: whim.status === 'confirmed' ? colors.success : colors.warning },
                    ]} />
                  </View>
                );
              })}

              {publicPlansOnSelected.map(plan => {
                const cfg = planTypeConfig[plan.planType];
                const icon = activityIcons[plan.activityType] ?? 'flash-outline';
                const activityLabel = plan.activityType === 'watch_sports' ? 'Watch Sports'
                  : plan.activityType === 'sports' ? 'Live Events'
                    : plan.activityType.charAt(0).toUpperCase() + plan.activityType.slice(1);
                const isMyPlan = plan.creatorId === user?.id;
                return (
                  <View key={plan.id} style={styles.planCard}>
                    <LinearGradient
                      colors={cfg?.gradient ?? colors.gradients.primary}
                      style={styles.planIconBg}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={icon as any} size={16} color={colors.textInverse} />
                    </LinearGradient>
                    <View style={styles.planInfo}>
                      <Text style={styles.planName} numberOfLines={1}>{plan.planName}</Text>
                      <Text style={styles.planTypeSecondary}>
                        {activityLabel} · {plan.neighborhood}
                      </Text>
                      <Text style={styles.planTime}>{plan.timeStart}</Text>
                    </View>
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>
                        {isMyPlan ? 'Hosting' : 'Joined'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing['4xl'] },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.heavy,
    color: '#fff',
    letterSpacing: -0.5,
  },
  todayChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  todayChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },

  calCard: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    marginBottom: spacing.xl,
  },
  dowRow: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingVertical: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    minHeight: 52,
    gap: 2,
    margin: 1,
    justifyContent: 'center',
  },
  dayCellFaded: { opacity: 0.25 },
  dayCellGoodWeather: { backgroundColor: colors.goodWeatherTint },
  dayCellToday: { backgroundColor: colors.primary + '14' },
  dayCellSelected: { backgroundColor: colors.primary },
  dayNum: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  dayNumFaded: { color: colors.textTertiary },
  dayNumToday: { color: colors.primary, fontWeight: typography.weights.heavy },
  dayNumSelected: { color: colors.textInverse, fontWeight: typography.weights.heavy },
  planDot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  planDotSelected: { backgroundColor: 'rgba(255,255,255,0.8)' },

  plansSection: { paddingHorizontal: spacing.base },
  plansSectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  planIconBg: {
    width: 38, height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: { flex: 1 },
  planName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  planType: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  planTypeSecondary: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  planTime: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusDot: {
    width: 8, height: 8,
    borderRadius: radii.full,
  },
  planBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.primary + '14',
  },
  planBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
});
