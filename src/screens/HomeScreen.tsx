import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { format, addDays, startOfDay, isToday, isSameDay } from 'date-fns';

import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useWhimStore } from '../store/whimStore';
import { useWeather } from '../hooks/useWeather';
import { useLocation } from '../hooks/useLocation';
import { colors, typography, spacing, radii, shadows, getWeatherBg } from '../theme';
import GradientBackground from '../components/GradientBackground';
import { getGreeting, getTodayLabel } from '../utils/dateUtils';
import { weatherIcon } from '../utils/formatters';
import WeatherBanner from '../components/WeatherBanner';
import WhimCard from '../components/WhimCard';
import EmptyState from '../components/common/EmptyState';
import DailyRecs from '../components/DailyRecs';
import NotificationsPanel from '../components/NotificationsPanel';
import { useRecsStore } from '../store/recommendationsStore';
import { useFriendsStore } from '../store/friendsStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { registerForPushNotifications, scheduleMorningNudge } from '../services/notificationService';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updatePushToken } = useAuthStore();
  const { whims } = useWhimStore();
  const { lat, lon } = useLocation();
  const { weather, alerts, isLoading, refresh } = useWeather(lat ?? undefined, lon ?? undefined);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [stripDate, setStripDate] = useState<Date>(new Date());
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const { recs, isLoading: recsLoading, load: loadRecs, refresh: refreshRecs } = useRecsStore();
  const { friends } = useFriendsStore();
  const { load: loadNotifs, push: pushNotif, unreadCount } = useNotificationsStore();

  // Friends who are free today (weekAvailability[0] = today) with non-private visibility
  const availableFriends = friends.filter(
    f => f.weekAvailability[0] === 'free' && f.availabilityVisibility !== 'private',
  );

  // Register push token + load stored notifications on mount
  useEffect(() => {
    loadNotifs();
    registerForPushNotifications().then(token => {
      if (token && user) updatePushToken(token);
    });
  }, [user?.id]);

  // Schedule morning nudge when we know how many friends are free
  useEffect(() => {
    if (availableFriends.length > 0) {
      scheduleMorningNudge(availableFriends.length);
    }
  }, [availableFriends.length]);

  // Load daily recommendations once weather is available
  useEffect(() => {
    if (weather) loadRecs(weather);
  }, [weather]);

  // Extract first name; guard against email-prefix names (no space = likely auto-generated username)
  const nameparts = user?.name?.trim().split(' ') ?? [];
  const firstName = nameparts.length >= 2 ? nameparts[0] : (nameparts[0] || 'there');
  const activeWhims = whims.filter(w => w.status !== 'cancelled' && w.status !== 'completed');
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  const handleRefresh = async () => {
    setRefreshing(true);
    refresh();
    if (weather) refreshRecs(weather);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleAlertAction = (alertId: string, actionType?: string) => {
    if (actionType === 'create_whim') navigation.navigate('CreateWhim');
    setDismissedAlerts(s => new Set([...s, alertId]));
  };

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

  const stripDays = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.profileAvatarPhoto} />
            ) : (
              <LinearGradient
                colors={colors.gradients.primary}
                style={styles.profileAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.profileInitial}>
                  {firstName[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.dateLabel}>{getTodayLabel()}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton} onPress={() => setNotifPanelOpen(true)}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {unreadCount() > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount() > 9 ? '9+' : unreadCount()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── 2-week strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekStrip}
          contentContainerStyle={styles.weekStripContent}
        >
          {stripDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const todayDay = isToday(day);
            const isSelected = isSameDay(day, stripDate);
            const fc = forecastMap[dayKey];
            const hasPlan = activeWhims.some(w => isSameDay(new Date(w.createdAt), day));
            const isGoodWeatherDay = !isSelected && !!fc?.isGood;
            return (
              <TouchableOpacity
                key={dayKey}
                style={[
                  styles.stripCell,
                  isGoodWeatherDay && styles.stripCellGoodWeather,
                  isSelected && styles.stripCellSelected,
                ]}
                onPress={() => setStripDate(day)}
                activeOpacity={0.75}
              >
                <Text style={[styles.stripDayName, isSelected && styles.stripTextSelected]}>
                  {todayDay ? 'TDY' : format(day, 'EEE').toUpperCase()}
                </Text>
                {fc ? (
                  <Ionicons
                    name={fc.icon as any}
                    size={12}
                    color={isSelected ? 'rgba(255,255,255,0.75)' : colors.textTertiary}
                  />
                ) : <View style={{ height: 12 }} />}
                <Text style={[styles.stripDayNum, isSelected && styles.stripTextSelected, todayDay && !isSelected && styles.stripTodayNum]}>
                  {format(day, 'd')}
                </Text>
                {fc && (
                  <Text style={[styles.stripTemp, isSelected && styles.stripTextSelected]}>{fc.high}°</Text>
                )}
                {hasPlan && <View style={[styles.stripDot, isSelected && styles.stripDotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Weather widget ── */}
        {weather && !isLoading && (
          <View style={styles.weatherWidget}>
            <LinearGradient
              colors={weather.current.isGoodWeather ? colors.gradients.good_weather : colors.gradients.bad_weather}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.weatherGradient}
            >
              <View style={styles.weatherMain}>
                <View style={styles.weatherLeft}>
                  <View style={styles.weatherTempRow}>
                    <Ionicons name={weatherIcon(weather.current.description) as any} size={20} color={colors.textInverse} />
                    <Text style={styles.weatherTemp}>{weather.current.temp}°</Text>
                  </View>
                  <Text style={styles.weatherDesc}>{weather.city} · {weather.current.description}</Text>
                </View>
                <View style={styles.weatherMeta}>
                  <View style={styles.weatherMetaItem}>
                    <Ionicons name="flag-outline" size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.weatherMetaText}>{weather.current.windSpeed} mph</Text>
                  </View>
                  <View style={styles.weatherMetaItem}>
                    <Ionicons name="water-outline" size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.weatherMetaText}>{weather.current.humidity}%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.forecast}>
                {weather.forecast.slice(0, 4).map((day, idx) => (
                  <View key={day.date} style={styles.forecastDay}>
                    <Ionicons name={weatherIcon(day.description) as any} size={16} color={colors.textInverse} />
                    <Text style={styles.forecastTemp}>{day.tempHigh}°</Text>
                    <Text style={styles.forecastTempLow}>{day.tempLow}°</Text>
                    {idx === 0 && (
                      <Text style={styles.forecastTodayLabel}>Today</Text>
                    )}
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Weather alerts ── */}
        {visibleAlerts.map(alert => (
          <WeatherBanner
            key={alert.id}
            alert={alert}
            onAction={() => handleAlertAction(alert.id, alert.actionType)}
            onDismiss={() => setDismissedAlerts(s => new Set([...s, alert.id]))}
          />
        ))}

        {/* ── Start a Whim CTA ── */}
        <TouchableOpacity
          style={styles.ctaWrapper}
          onPress={() => navigation.navigate('CreateWhim')}
          activeOpacity={0.85}
        >
          <View style={styles.cta}>
            <View>
              <Text style={styles.ctaTitle}>Start a Whim</Text>
              <Text style={styles.ctaSubtitle}>What's the move?</Text>
            </View>
            <View style={styles.ctaIcon}>
              <Ionicons name="add" size={22} color={colors.textInverse} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Daily recommendations ── */}
        <DailyRecs
          recs={recs}
          isLoading={recsLoading}
          onRefresh={weather ? () => refreshRecs(weather) : undefined}
          availableFriends={availableFriends}
        />

        {/* ── Active plans ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active plans</Text>
          {activeWhims.length === 0 ? (
            <EmptyState
              icon="map-outline"
              title="No plans yet"
              subtitle="NYC is full of possibilities. Start a whim and see what happens."
              actionLabel="Start a Whim"
              onAction={() => navigation.navigate('CreateWhim')}
            />
          ) : (
            activeWhims.map(w => (
              <WhimCard
                key={w.id}
                whim={w}
                onPress={() => navigation.navigate('WhimDetail', { whimId: w.id })}
              />
            ))
          )}
        </View>

        {/* ── Public Plans teaser ── */}
        <TouchableOpacity
          style={styles.publicTease}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Main', { screen: 'PublicTab' } as any)}
        >
          <LinearGradient
            colors={colors.gradients.publicPlans}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.publicTeaseBg}
          >
            <Ionicons name="people" size={22} color="rgba(255,255,255,0.9)" />
            <View style={styles.publicTeaseText}>
              <Text style={styles.publicTeaseTitle}>Explore Public Plans</Text>
              <Text style={styles.publicTeaseSubtitle}>See what strangers are getting into.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>

    {/* Notifications slide-in panel */}
    <NotificationsPanel
      visible={notifPanelOpen}
      onClose={() => setNotifPanelOpen(false)}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing['4xl'] },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  profileButton: {},
  profileAvatar: {
    width: 38, height: 38,
    borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarPhoto: {
    width: 38, height: 38,
    borderRadius: radii.full,
    resizeMode: 'cover',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  profileInitial: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  headerCenter: { flex: 1 },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.4,
  },
  dateLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notifButton: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifBadge: {
    position: 'absolute',
    top: 0, right: 0,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.heavy,
    color: '#fff',
    lineHeight: 11,
  },

  // Week strip
  weekStrip: { marginBottom: spacing.md },
  weekStripContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  stripCell: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minWidth: 40,
    gap: 2,
  },
  stripCellGoodWeather: { backgroundColor: colors.goodWeatherTint },
  stripCellSelected: { backgroundColor: colors.primary },
  stripDayName: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  stripDayNum: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  stripTodayNum: { color: colors.primary },
  stripTextSelected: { color: colors.textInverse },
  stripTemp: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  stripDot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  stripDotSelected: { backgroundColor: 'rgba(255,255,255,0.8)' },

  // Weather
  weatherWidget: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  weatherGradient: {
    padding: spacing.base,
    gap: spacing.md,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLeft: { gap: 4 },
  weatherTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weatherTemp: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  weatherDesc: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
  },
  weatherMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  weatherMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherMetaText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  forecast: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  forecastDay: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  forecastTemp: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  forecastTempLow: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: 'rgba(255,255,255,0.6)',
  },
  forecastTodayLabel: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // CTA
  ctaWrapper: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radii.xl,
    ...shadows.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.secondary,
  },
  ctaTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
  ctaSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  ctaIcon: {
    width: 36, height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Plans
  section: { marginTop: spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },

  // Public Plans teaser
  publicTease: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: radii.xl,
    ...shadows.md,
  },
  publicTeaseBg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.xl,
  },
  publicTeaseText: { flex: 1 },
  publicTeaseTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  publicTeaseSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});
