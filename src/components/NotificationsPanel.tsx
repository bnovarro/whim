import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Animated, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useNotificationsStore, AppNotification, NotifType } from '../store/notificationsStore';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<NotifType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  whim_created:  { name: 'flash',               color: colors.primary },
  whim_reminder: { name: 'time-outline',         color: colors.warning },
  friend_free:   { name: 'people',               color: '#22C55E' },
  weather_good:  { name: 'sunny',                color: colors.warning },
  friend_joined: { name: 'person-add',           color: colors.primary },
  plan_posted:   { name: 'compass',              color: '#8B5CF6' },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  const icon = ICON_MAP[notif.type] ?? { name: 'notifications-outline' as const, color: colors.primary };
  return (
    <TouchableOpacity
      style={[styles.row, !notif.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: icon.color + '18' }]}>
        <Ionicons name={icon.name} size={18} color={icon.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{notif.title}</Text>
        <Text style={styles.rowBody} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.rowTime}>{timeAgo(notif.timestamp)}</Text>
      </View>
      {!notif.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function NotificationsPanel({ visible, onClose }: Props) {
  const navigation = useNavigation<Nav>();
  const { notifications, markRead, markAllRead, clear, unreadCount } = useNotificationsStore();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handlePress = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.data?.whimId) {
      onClose();
      navigation.navigate('WhimDetail', { whimId: notif.data.whimId });
    } else if (notif.data?.actionType === 'create_whim') {
      onClose();
      navigation.navigate('CreateWhim');
    }
  };

  if (!visible) return null;

  const count = unreadCount();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Notifications</Text>
              {count > 0 && (
                <Text style={styles.headerSub}>{count} unread</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {count > 0 && (
                <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
                  <Text style={styles.headerBtnText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptySub}>You'll see Whim activity here — friend updates, reminders, weather alerts.</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={n => n.id}
              renderItem={({ item }) => (
                <NotifRow notif={item} onPress={() => handlePress(item)} />
              )}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Clear all */}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clear}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 320;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  panel: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.background,
    ...shadows.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  headerSub: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.md,
  },
  headerBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowUnread: {
    backgroundColor: '#FFF8F3',
  },
  iconWrap: {
    width: 36, height: 36,
    borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  rowBody: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  rowTime: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  unreadDot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  clearBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontWeight: typography.weights.medium,
  },
});
