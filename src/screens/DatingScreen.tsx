import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PublicPlan, ActivityType, VibeTag, FoodCuisine, DrinkVenueType } from '../types';
import { usePublicPlansStore } from '../store/publicPlansStore';
import { usePreferencesStore, InterestedIn } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';
import { useWeather } from '../hooks/useWeather';
import { useLocation } from '../hooks/useLocation';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  activityColors,
  activityIcons,
  vibeLabels,
  cuisineLabels,
  drinkTypeLabels,
  planTypeConfig,
  getWeatherBg,
} from '../theme';
import { RootStackParamList } from '../navigation/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_GRADIENT: [string, string] = ['#FF3D6B', '#FF6B9D'];

const GRAD_POOL: Array<[string, string]> = [
  ['#FF6B35', '#FF3D6B'],   // orange → rose
  ['#FF8C42', '#FF6B9D'],   // amber → pink
  ['#F97316', '#EC4899'],   // warm orange → magenta pink
  ['#FF9A56', '#FF5E8A'],   // peach → warm rose
  ['#E55A25', '#FF3D6B'],   // deep orange → hot rose
  ['#FFAA6B', '#FF6B9D'],   // light peach → soft pink
  ['#FF6B6B', '#C026D3'],   // coral → violet
];

const DATE_ACTIVITY_OPTS: { type: ActivityType; label: string; icon: string }[] = [
  { type: 'drinks', label: 'Drinks', icon: 'wine-outline' },
  { type: 'dinner', label: 'Dinner', icon: 'restaurant-outline' },
  { type: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
  { type: 'activity', label: 'Activity', icon: 'flash-outline' },
];

const VIBE_OPTS: VibeTag[] = [
  'intimate',
  'casual',
  'upscale',
  'date_night',
  'trendy',
  'rooftop',
];

const NYC_NEIGHBORHOODS = [
  'West Village',
  'East Village',
  'SoHo',
  'Williamsburg',
  'Lower East Side',
  'Chelsea',
  'NoMad',
  'Koreatown',
  'Nolita',
  'Tribeca',
  'Brooklyn Heights',
  'Park Slope',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planSubLabel(plan: PublicPlan): string {
  if (plan.activityType === 'dinner' && plan.cuisine) return cuisineLabels[plan.cuisine] ?? '';
  if (plan.activityType === 'drinks' && plan.barType) return drinkTypeLabels[plan.barType] ?? '';
  return plan.activityType.charAt(0).toUpperCase() + plan.activityType.slice(1);
}

function avatarGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRAD_POOL[Math.abs(hash) % GRAD_POOL.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 44, photo }: { name: string; size?: number; photo?: string }) {
  const grad = avatarGradient(name);
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2, resizeMode: 'cover' }}
      />
    );
  }
  return (
    <LinearGradient
      colors={grad}
      style={[avatarStyles.container, { width: size, height: size, borderRadius: size / 2 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[avatarStyles.text, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
    </LinearGradient>
  );
}

const avatarStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: typography.weights.heavy, color: colors.textInverse, letterSpacing: -0.3 },
});

// ─── Quick Chat Modal ─────────────────────────────────────────────────────────

function QuickChatModal({
  visible,
  onClose,
  planId,
  otherUserId,
  otherName,
  currentUserId,
  currentName,
}: {
  visible: boolean;
  onClose: () => void;
  planId: string;
  otherUserId: string;
  otherName: string;
  currentUserId: string;
  currentName: string;
}) {
  const { chats, sendMessage } = usePublicPlansStore();
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const chatKey = `${planId}_${otherUserId}`;
  const messages = chats[chatKey] ?? [];

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(planId, otherUserId, currentUserId, currentName, text.trim());
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={chatStyles.safe} edges={['top', 'bottom']}>
        <View style={chatStyles.header}>
          <TouchableOpacity onPress={onClose} style={chatStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={chatStyles.headerCenter}>
            <Avatar name={otherName} size={32} />
            <Text style={chatStyles.headerName}>{otherName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={chatStyles.messageList}
          contentContainerStyle={chatStyles.messageContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && (
            <Text style={chatStyles.emptyChat}>
              Say hi — you matched on this date plan.
            </Text>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === currentUserId;
            return (
              <View
                key={msg.id}
                style={[chatStyles.bubble, isMe ? chatStyles.bubbleMe : chatStyles.bubbleThem]}
              >
                <Text style={[chatStyles.bubbleText, isMe && chatStyles.bubbleTextMe]}>
                  {msg.text}
                </Text>
                <Text style={chatStyles.bubbleTime}>
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={chatStyles.inputRow}>
            <TextInput
              style={chatStyles.input}
              placeholder="Message..."
              placeholderTextColor={colors.textTertiary}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[chatStyles.sendBtn, !text.trim() && chatStyles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={text.trim() ? colors.textInverse : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const chatStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  messageList: { flex: 1 },
  messageContent: { padding: spacing.base, gap: spacing.sm },
  emptyChat: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: spacing['3xl'],
    fontStyle: 'italic',
  },
  bubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#FF3D6B' },
  bubbleThem: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: typography.sizes.base, color: colors.text, lineHeight: 20 },
  bubbleTextMe: { color: colors.textInverse },
  bubbleTime: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: '#FF3D6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceSecondary },
});

// ─── Interested Modal (inline accept/decline for dating plans) ────────────────

function InterestedModal({
  visible,
  onClose,
  plan,
  currentUserId,
  currentName,
}: {
  visible: boolean;
  onClose: () => void;
  plan: PublicPlan;
  currentUserId: string;
  currentName: string;
}) {
  const { acceptInterest, declineInterest } = usePublicPlansStore();
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string } | null>(null);

  const pending = plan.interestedUsers.filter(u => u.status === 'pending');
  const accepted = plan.interestedUsers.filter(u => u.status === 'accepted');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={intStyles.safe} edges={['top', 'bottom']}>
        <View style={intStyles.header}>
          <TouchableOpacity onPress={onClose} style={intStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={intStyles.title}>Interested</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={intStyles.content}>
          {pending.length === 0 && accepted.length === 0 && (
            <View style={intStyles.emptyWrap}>
              <LinearGradient
                colors={DATE_GRADIENT}
                style={intStyles.emptyIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="heart-outline" size={28} color={colors.textInverse} />
              </LinearGradient>
              <Text style={intStyles.emptyText}>No interest yet</Text>
              <Text style={intStyles.emptySubtext}>
                Your date plan is live. Share it to get more visibility.
              </Text>
            </View>
          )}

          {pending.length > 0 && (
            <View style={intStyles.section}>
              <Text style={intStyles.sectionLabel}>Pending ({pending.length})</Text>
              {pending.map(u => (
                <View key={u.userId} style={intStyles.personRow}>
                  <Avatar name={u.name} size={44} />
                  <View style={intStyles.personInfo}>
                    <Text style={intStyles.personName}>{u.name}</Text>
                    {u.instagram ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(`https://instagram.com/${u.instagram}`)
                        }
                      >
                        <Text style={intStyles.personIg}>@{u.instagram}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Text style={intStyles.personTime}>
                      {formatDistanceToNow(new Date(u.requestedAt), { addSuffix: true })}
                    </Text>
                  </View>
                  <View style={intStyles.personActions}>
                    <TouchableOpacity
                      style={intStyles.acceptBtn}
                      onPress={() => acceptInterest(plan.id, u.userId)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={17} color={colors.textInverse} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={intStyles.declineBtn}
                      onPress={() => declineInterest(plan.id, u.userId)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={17} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {accepted.length > 0 && (
            <View style={intStyles.section}>
              <Text style={intStyles.sectionLabel}>Matched ({accepted.length})</Text>
              {accepted.map(u => (
                <View key={u.userId} style={intStyles.personRow}>
                  <Avatar name={u.name} size={44} />
                  <View style={intStyles.personInfo}>
                    <Text style={intStyles.personName}>{u.name}</Text>
                    {u.instagram ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(`https://instagram.com/${u.instagram}`)
                        }
                      >
                        <Text style={intStyles.personIg}>@{u.instagram}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={intStyles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={intStyles.matchText}>Matched</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={intStyles.chatBtn}
                    onPress={() => setChatTarget({ userId: u.userId, name: u.name })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color="#FF3D6B" />
                    <Text style={intStyles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {chatTarget && (
          <QuickChatModal
            visible={!!chatTarget}
            onClose={() => setChatTarget(null)}
            planId={plan.id}
            otherUserId={chatTarget.userId}
            otherName={chatTarget.name}
            currentUserId={currentUserId}
            currentName={currentName}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const intStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  content: { padding: spacing.base, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  personInfo: { flex: 1 },
  personName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  personIg: { fontSize: typography.sizes.xs, color: '#FF3D6B', marginTop: 2 },
  personTime: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginTop: 2 },
  personActions: { flexDirection: 'row', gap: spacing.xs },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  matchText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#FF3D6B50',
    backgroundColor: '#FF3D6B10',
  },
  chatBtnText: {
    fontSize: typography.sizes.xs,
    color: '#FF3D6B',
    fontWeight: typography.weights.bold,
  },
  emptyWrap: {
    paddingTop: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 19,
  },
});

// ─── Preferences Modal ────────────────────────────────────────────────────────

function PreferencesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    interestedIn,
    activityPrefs,
    vibePrefs,
    neighborhoodPrefs,
    setInterestedIn,
    toggleActivityPref,
    toggleVibePref,
    toggleNeighborhoodPref,
    resetPreferences,
  } = usePreferencesStore();

  const INTERESTED_OPTS: { val: InterestedIn; label: string; icon: string }[] = [
    { val: 'men', label: 'Men', icon: 'man-outline' },
    { val: 'women', label: 'Women', icon: 'woman-outline' },
    { val: 'everyone', label: 'Everyone', icon: 'heart-outline' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={prefStyles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={prefStyles.header}>
          <TouchableOpacity onPress={onClose} style={prefStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={prefStyles.title}>Spark Preferences</Text>
          <TouchableOpacity onPress={resetPreferences} style={prefStyles.resetBtn}>
            <Text style={prefStyles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={prefStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Interested in */}
          <View style={prefStyles.section}>
            <Text style={prefStyles.sectionLabel}>Interested in</Text>
            <View style={prefStyles.interestedRow}>
              {INTERESTED_OPTS.map(opt => {
                const active = interestedIn === opt.val;
                return (
                  <TouchableOpacity
                    key={opt.val}
                    style={[prefStyles.interestedCard, active && prefStyles.interestedCardActive]}
                    onPress={() => setInterestedIn(opt.val)}
                    activeOpacity={0.8}
                  >
                    {active && (
                      <LinearGradient
                        colors={DATE_GRADIENT}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    <Ionicons
                      name={opt.icon as any}
                      size={24}
                      color={active ? colors.textInverse : colors.textSecondary}
                    />
                    <Text
                      style={[
                        prefStyles.interestedCardLabel,
                        active && prefStyles.interestedCardLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Activity types */}
          <View style={prefStyles.section}>
            <Text style={prefStyles.sectionLabel}>Activity type</Text>
            <Text style={prefStyles.sectionHint}>Empty means all activities</Text>
            <View style={prefStyles.chipRow}>
              {DATE_ACTIVITY_OPTS.map(opt => {
                const active = activityPrefs.includes(opt.type);
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[prefStyles.chip, active && prefStyles.chipActive]}
                    onPress={() => toggleActivityPref(opt.type)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={14}
                      color={active ? '#FF3D6B' : colors.textSecondary}
                    />
                    <Text
                      style={[prefStyles.chipText, active && prefStyles.chipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Vibe */}
          <View style={prefStyles.section}>
            <Text style={prefStyles.sectionLabel}>Vibe</Text>
            <Text style={prefStyles.sectionHint}>Empty means all vibes</Text>
            <View style={prefStyles.chipRow}>
              {VIBE_OPTS.map(v => {
                const active = vibePrefs.includes(v);
                return (
                  <TouchableOpacity
                    key={v}
                    style={[prefStyles.chip, active && prefStyles.chipActive]}
                    onPress={() => toggleVibePref(v)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[prefStyles.chipText, active && prefStyles.chipTextActive]}
                    >
                      {vibeLabels[v] ?? v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Neighborhoods */}
          <View style={prefStyles.section}>
            <Text style={prefStyles.sectionLabel}>Neighborhoods</Text>
            <Text style={prefStyles.sectionHint}>Empty means all neighborhoods</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={prefStyles.hChipRow}
            >
              {NYC_NEIGHBORHOODS.map(n => {
                const active = neighborhoodPrefs.includes(n);
                return (
                  <TouchableOpacity
                    key={n}
                    style={[prefStyles.chip, active && prefStyles.chipActive]}
                    onPress={() => toggleNeighborhoodPref(n)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[prefStyles.chipText, active && prefStyles.chipTextActive]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Apply */}
        <View style={prefStyles.footer}>
          <LinearGradient
            colors={DATE_GRADIENT}
            style={prefStyles.applyGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity
              style={prefStyles.applyInner}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={prefStyles.applyText}>Apply</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const prefStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  resetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resetText: {
    fontSize: typography.sizes.sm,
    color: '#FF3D6B',
    fontWeight: typography.weights.semibold,
  },
  content: {
    padding: spacing.base,
    gap: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: -spacing.xs,
  },
  // Interested in cards
  interestedRow: { flexDirection: 'row', gap: spacing.sm },
  interestedCard: {
    flex: 1,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  interestedCardActive: {
    borderColor: 'transparent',
  },
  interestedCardLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  interestedCardLabelActive: { color: colors.textInverse },
  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  hChipRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: '#FF3D6B18',
    borderColor: '#FF3D6B',
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  chipTextActive: {
    color: '#FF3D6B',
    fontWeight: typography.weights.bold,
  },
  // Footer
  footer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  applyGrad: { borderRadius: radii.xl, overflow: 'hidden' },
  applyInner: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
});

// ─── Discover Card (other people's date plans) ───────────────────────────────

function DatePlanCard({
  plan,
  currentUserId,
  currentName,
  currentInstagram,
  onCreatorPress,
}: {
  plan: PublicPlan;
  currentUserId: string;
  currentName: string;
  currentInstagram?: string;
  onCreatorPress?: () => void;
}) {
  const { expressInterest, withdrawInterest } = usePublicPlansStore();
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string } | null>(null);

  const gradient = (activityColors[plan.activityType] ?? activityColors.drinks) as [string, string];
  const icon = activityIcons[plan.activityType] ?? 'flash-outline';
  const subLabel = planSubLabel(plan);
  const cfg = planTypeConfig['exclusive_date'];
  const acceptedMatches = plan.interestedUsers.filter(u => u.status === 'accepted');
  const spotsLeft = plan.maxAttendees ? plan.maxAttendees - plan.attendeeCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const timeAgo = formatDistanceToNow(new Date(plan.createdAt), { addSuffix: true });
  const myAcceptedMatch = acceptedMatches.find(u => u.userId === currentUserId);

  const handleInterest = () => {
    if (plan.hasExpressedInterest) {
      withdrawInterest(plan.id, currentUserId);
    } else {
      expressInterest(plan.id, currentUserId, currentName, currentInstagram);
    }
  };

  return (
    <View style={cardStyles.card}>
      {/* Badge */}
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={cardStyles.typeBadge}
      >
        <Ionicons name={cfg.icon as any} size={11} color="rgba(255,255,255,0.95)" />
        <Text style={cardStyles.typeBadgeText}>{cfg.label}</Text>
      </LinearGradient>

      {/* Poster row — tappable to view their profile */}
      <TouchableOpacity
        style={cardStyles.posterRow}
        onPress={onCreatorPress}
        activeOpacity={onCreatorPress ? 0.7 : 1}
        disabled={!onCreatorPress}
      >
        <Avatar name={plan.creatorName} size={46} photo={plan.creatorPhoto} />
        <View style={cardStyles.posterInfo}>
          <Text style={cardStyles.posterName}>{plan.creatorName}</Text>
          {plan.creatorInstagram ? (
            <View style={cardStyles.igRow}>
              <Ionicons name="logo-instagram" size={12} color={colors.textTertiary} />
              <Text style={cardStyles.igHandle}>@{plan.creatorInstagram}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={cardStyles.timeAgo}>{timeAgo}</Text>
          {onCreatorPress && (
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Activity pill */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={cardStyles.activityPill}
      >
        <Ionicons name={icon as any} size={12} color="rgba(255,255,255,0.95)" />
        <Text style={cardStyles.activityPillText}>{subLabel}</Text>
      </LinearGradient>

      <Text style={cardStyles.planName}>{plan.planName}</Text>

      {plan.description ? (
        <Text style={cardStyles.description} numberOfLines={2}>{plan.description}</Text>
      ) : null}

      {/* Details */}
      <View style={cardStyles.detailsRow}>
        <View style={cardStyles.detailItem}>
          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
          <Text style={cardStyles.detailText}>{plan.neighborhood}</Text>
        </View>
        <View style={cardStyles.detailSep} />
        <View style={cardStyles.detailItem}>
          <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
          <Text style={cardStyles.detailText}>{plan.timeStart}</Text>
        </View>
        <View style={cardStyles.detailSep} />
        <View style={cardStyles.detailItem}>
          <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
          <Text style={cardStyles.detailText}>
            {plan.attendeeCount}{plan.maxAttendees ? `/${plan.maxAttendees}` : ''} going
          </Text>
        </View>
      </View>

      {plan.vibes.length > 0 && (
        <View style={cardStyles.vibesRow}>
          {plan.vibes.slice(0, 3).map(v => (
            <View key={v} style={cardStyles.vibePill}>
              <Text style={cardStyles.vibePillText}>{vibeLabels[v] ?? v}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action */}
      {plan.isJoined || myAcceptedMatch ? (
        <TouchableOpacity
          style={cardStyles.chatBtn}
          onPress={() => setChatTarget({ userId: plan.creatorId, name: plan.creatorName })}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.textInverse} />
          <Text style={cardStyles.chatBtnText}>Chat with {plan.creatorName.split(' ')[0]}</Text>
        </TouchableOpacity>
      ) : plan.hasExpressedInterest ? (
        <TouchableOpacity style={cardStyles.interestSentBtn} onPress={handleInterest} activeOpacity={0.8}>
          <Ionicons name="heart" size={16} color="#FF3D6B" />
          <Text style={cardStyles.interestSentText}>Interest sent · tap to withdraw</Text>
        </TouchableOpacity>
      ) : isFull ? (
        <View style={cardStyles.fullBtn}>
          <Text style={cardStyles.fullBtnText}>Full</Text>
        </View>
      ) : (
        <LinearGradient
          colors={DATE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.actionGrad}
        >
          <TouchableOpacity style={cardStyles.actionGradInner} onPress={handleInterest} activeOpacity={0.85}>
            <Ionicons name="heart-outline" size={16} color={colors.textInverse} />
            <Text style={cardStyles.actionGradText}>I'm Interested</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {chatTarget && (
        <QuickChatModal
          visible={!!chatTarget}
          onClose={() => setChatTarget(null)}
          planId={plan.id}
          otherUserId={chatTarget.userId}
          otherName={chatTarget.name}
          currentUserId={currentUserId}
          currentName={currentName}
        />
      )}
    </View>
  );
}

// ─── Person Profile Modal (full profile view before accept/decline) ───────────

interface PersonForModal {
  userId: string;
  name: string;
  instagram?: string;
  photo?: string;
}

function PersonProfileModal({
  visible, onClose, person, plan, currentUserId, currentName,
}: {
  visible: boolean;
  onClose: () => void;
  person: PersonForModal;
  plan: PublicPlan;
  currentUserId: string;
  currentName: string;
}) {
  const { acceptInterest, declineInterest } = usePublicPlansStore();
  const [chatVisible, setChatVisible] = useState(false);

  const intRow  = plan.interestedUsers.find(u => u.userId === person.userId);
  const isPending  = intRow?.status === 'pending';
  const isAccepted = intRow?.status === 'accepted';
  const grad = avatarGradient(person.name);
  const initials = getInitials(person.name);
  const firstName = person.name.split(' ')[0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={ppStyles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={ppStyles.header}>
          <TouchableOpacity onPress={onClose} style={ppStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={ppStyles.headerTitle}>{firstName}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={ppStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Large avatar / photo */}
          <View style={ppStyles.avatarWrap}>
            {person.photo ? (
              <Image source={{ uri: person.photo }} style={ppStyles.photo} />
            ) : (
              <LinearGradient
                colors={grad}
                style={ppStyles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={ppStyles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Name */}
          <Text style={ppStyles.name}>{person.name}</Text>

          {/* Instagram */}
          {person.instagram ? (
            <TouchableOpacity
              style={ppStyles.igChip}
              onPress={() => Linking.openURL(`https://instagram.com/${person.instagram}`)}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-instagram" size={14} color={DATE_GRADIENT[0]} />
              <Text style={ppStyles.igText}>@{person.instagram}</Text>
              <Ionicons name="open-outline" size={12} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}

          {/* Interest context */}
          <View style={ppStyles.contextCard}>
            <Ionicons name="heart-outline" size={15} color={DATE_GRADIENT[0]} />
            <Text style={ppStyles.contextText}>
              Interested in{' '}
              <Text style={ppStyles.contextBold}>{plan.planName}</Text>
            </Text>
          </View>

          {intRow && (
            <Text style={ppStyles.timeText}>
              {formatDistanceToNow(new Date(intRow.requestedAt), { addSuffix: true })}
            </Text>
          )}

          {/* Matched confirmation */}
          {isAccepted && (
            <View style={ppStyles.matchedBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={ppStyles.matchedBannerText}>You matched!</Text>
            </View>
          )}
        </ScrollView>

        {/* Action bar */}
        <View style={ppStyles.footer}>
          {isPending ? (
            <>
              <TouchableOpacity
                style={ppStyles.declineBtn}
                onPress={() => { declineInterest(plan.id, person.userId); onClose(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
                <Text style={ppStyles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <LinearGradient
                colors={DATE_GRADIENT}
                style={ppStyles.acceptGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity
                  style={ppStyles.acceptInner}
                  onPress={() => { acceptInterest(plan.id, person.userId); onClose(); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={20} color={colors.textInverse} />
                  <Text style={ppStyles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </LinearGradient>
            </>
          ) : isAccepted ? (
            <LinearGradient
              colors={DATE_GRADIENT}
              style={[ppStyles.acceptGrad, { flex: 1 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity
                style={ppStyles.acceptInner}
                onPress={() => setChatVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.textInverse} />
                <Text style={ppStyles.acceptBtnText}>Chat with {firstName}</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : null}
        </View>

        {chatVisible && (
          <QuickChatModal
            visible={chatVisible}
            onClose={() => setChatVisible(false)}
            planId={plan.id}
            otherUserId={person.userId}
            otherName={person.name}
            currentUserId={currentUserId}
            currentName={currentName}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const ppStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: {
    fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  avatarWrap: { marginBottom: spacing.md },
  photo: { width: 120, height: 120, borderRadius: 60, resizeMode: 'cover' },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40, fontWeight: typography.weights.heavy, color: colors.textInverse,
  },
  name: {
    fontSize: typography.sizes['2xl'], fontWeight: typography.weights.heavy,
    color: colors.text, letterSpacing: -0.5,
  },
  igChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: DATE_GRADIENT[0] + '12',
    borderWidth: 1, borderColor: DATE_GRADIENT[0] + '30',
  },
  igText: {
    fontSize: typography.sizes.sm, color: DATE_GRADIENT[0], fontWeight: typography.weights.semibold,
  },
  contextCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  contextText: {
    flex: 1, fontSize: typography.sizes.base, color: colors.textSecondary,
    lineHeight: typography.sizes.base * 1.4,
  },
  contextBold: {
    fontWeight: typography.weights.bold, color: colors.text,
  },
  timeText: {
    fontSize: typography.sizes.sm, color: colors.textTertiary, fontStyle: 'italic',
  },
  matchedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.success + '14',
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.success + '40',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    alignSelf: 'stretch', justifyContent: 'center',
    marginTop: spacing.sm,
  },
  matchedBannerText: {
    fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.success,
  },
  footer: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingBottom: spacing.base, paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
    borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  declineBtnText: {
    fontSize: typography.sizes.base, fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  acceptGrad: { flex: 2, borderRadius: radii.xl, overflow: 'hidden' },
  acceptInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
  },
  acceptBtnText: {
    fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textInverse,
  },
});

// ─── My Plan Card (your own date plans with inline interest management) ────────

function MyDatePlanCard({
  plan,
  currentUserId,
  currentName,
}: {
  plan: PublicPlan;
  currentUserId: string;
  currentName: string;
}) {
  const { acceptInterest, declineInterest } = usePublicPlansStore();
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string } | null>(null);
  const [profileTarget, setProfileTarget] = useState<PersonForModal | null>(null);
  const [expanded, setExpanded] = useState(true);

  const pending = plan.interestedUsers.filter(u => u.status === 'pending');
  const accepted = plan.interestedUsers.filter(u => u.status === 'accepted');
  const gradient = (activityColors[plan.activityType] ?? activityColors.drinks) as [string, string];
  const icon = activityIcons[plan.activityType] ?? 'flash-outline';
  const subLabel = planSubLabel(plan);
  const hasPending = pending.length > 0;

  return (
    <View style={myStyles.card}>
      {/* Plan header */}
      <TouchableOpacity
        style={myStyles.planHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradient}
          style={myStyles.planIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon as any} size={18} color={colors.textInverse} />
        </LinearGradient>
        <View style={myStyles.planHeaderInfo}>
          <Text style={myStyles.planName} numberOfLines={1}>{plan.planName}</Text>
          <Text style={myStyles.planMeta}>
            {subLabel} · {plan.neighborhood} · {plan.timeStart}
          </Text>
        </View>
        <View style={myStyles.planHeaderRight}>
          {hasPending && (
            <View style={myStyles.pendingBadge}>
              <Text style={myStyles.pendingBadgeText}>{pending.length}</Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Pending requests */}
          {pending.length > 0 && (
            <View style={myStyles.section}>
              <Text style={myStyles.sectionLabel}>
                Interested ({pending.length})
              </Text>
              {pending.map(u => (
                <TouchableOpacity
                  key={u.userId}
                  style={myStyles.personRow}
                  onPress={() => setProfileTarget({ userId: u.userId, name: u.name, instagram: u.instagram })}
                  activeOpacity={0.85}
                >
                  <Avatar name={u.name} size={42} />
                  <View style={myStyles.personInfo}>
                    <Text style={myStyles.personName}>{u.name}</Text>
                    {u.instagram ? (
                      <Text style={myStyles.personIg}>@{u.instagram}</Text>
                    ) : null}
                    <Text style={myStyles.personTime}>
                      {formatDistanceToNow(new Date(u.requestedAt), { addSuffix: true })}
                    </Text>
                  </View>
                  <View style={myStyles.actionBtns}>
                    <TouchableOpacity
                      style={myStyles.acceptBtn}
                      onPress={() => acceptInterest(plan.id, u.userId)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={17} color={colors.textInverse} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={myStyles.declineBtn}
                      onPress={() => declineInterest(plan.id, u.userId)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={17} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Accepted matches */}
          {accepted.length > 0 && (
            <View style={myStyles.section}>
              <Text style={myStyles.sectionLabel}>
                Matched ({accepted.length})
              </Text>
              {accepted.map(u => (
                <TouchableOpacity
                  key={u.userId}
                  style={myStyles.personRow}
                  onPress={() => setProfileTarget({ userId: u.userId, name: u.name, instagram: u.instagram })}
                  activeOpacity={0.85}
                >
                  <Avatar name={u.name} size={42} />
                  <View style={myStyles.personInfo}>
                    <Text style={myStyles.personName}>{u.name}</Text>
                    {u.instagram ? (
                      <Text style={myStyles.personIg}>@{u.instagram}</Text>
                    ) : null}
                    <View style={myStyles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={myStyles.matchText}>Matched</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={myStyles.chatBtn}
                    onPress={() => setChatTarget({ userId: u.userId, name: u.name })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color="#FF3D6B" />
                    <Text style={myStyles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty state */}
          {pending.length === 0 && accepted.length === 0 && (
            <View style={myStyles.emptyInterest}>
              <Ionicons name="heart-outline" size={20} color={colors.textTertiary} />
              <Text style={myStyles.emptyInterestText}>
                No interest yet — share your plan to get visibility.
              </Text>
            </View>
          )}
        </>
      )}

      {chatTarget && (
        <QuickChatModal
          visible={!!chatTarget}
          onClose={() => setChatTarget(null)}
          planId={plan.id}
          otherUserId={chatTarget.userId}
          otherName={chatTarget.name}
          currentUserId={currentUserId}
          currentName={currentName}
        />
      )}
      {profileTarget && (
        <PersonProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          person={profileTarget}
          plan={plan}
          currentUserId={currentUserId}
          currentName={currentName}
        />
      )}
    </View>
  );
}

const myStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  planIconBg: {
    width: 44, height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planHeaderInfo: { flex: 1 },
  planName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.2,
  },
  planMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 3,
  },
  planHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingBadge: {
    minWidth: 20, height: 20,
    borderRadius: radii.full,
    backgroundColor: '#FF3D6B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  personInfo: { flex: 1 },
  personName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  personIg: { fontSize: typography.sizes.xs, color: '#FF3D6B', marginTop: 2 },
  personTime: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginTop: 2 },
  actionBtns: { flexDirection: 'row', gap: spacing.xs },
  acceptBtn: {
    width: 38, height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 38, height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  matchText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#FF3D6B50',
    backgroundColor: '#FF3D6B10',
  },
  chatBtnText: {
    fontSize: typography.sizes.xs,
    color: '#FF3D6B',
    fontWeight: typography.weights.bold,
  },
  emptyInterest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyInterestText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  posterInfo: { flex: 1 },
  posterName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  igRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  igHandle: { fontSize: typography.sizes.xs, color: colors.textTertiary },
  timeAgo: { fontSize: typography.sizes.xs, color: colors.textTertiary },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  activityPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.2,
  },
  planName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  detailSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  vibesRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  vibePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  vibePillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  // Creator
  creatorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  interestedCountBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  interestedCountBtnActive: {
    borderColor: '#FF3D6B40',
    backgroundColor: '#FF3D6B0C',
  },
  interestedCountText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontWeight: typography.weights.medium,
  },
  interestedCountTextActive: { color: '#FF3D6B', fontWeight: typography.weights.bold },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3D6B',
    marginLeft: 'auto' as any,
  },
  matchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.success + '12',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  matchedBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: typography.weights.bold,
  },
  // Action buttons
  actionGrad: { borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.xs },
  actionGradInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
  },
  actionGradText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: '#FF3D6B',
  },
  chatBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  interestSentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: '#FF3D6B12',
    borderWidth: 1,
    borderColor: '#FF3D6B40',
  },
  interestSentText: {
    fontSize: typography.sizes.sm,
    color: '#FF3D6B',
    fontWeight: typography.weights.medium,
  },
  fullBtn: {
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullBtnText: { fontSize: typography.sizes.sm, color: colors.textTertiary },
});

// ─── Active Preference Chips Row ──────────────────────────────────────────────

function ActivePreferenceChips({ onPress }: { onPress: () => void }) {
  const { interestedIn, activityPrefs, vibePrefs, neighborhoodPrefs } = usePreferencesStore();

  const chips: string[] = [];

  if (interestedIn !== 'everyone') {
    chips.push(interestedIn.charAt(0).toUpperCase() + interestedIn.slice(1));
  }
  activityPrefs.forEach(a => {
    const opt = DATE_ACTIVITY_OPTS.find(o => o.type === a);
    if (opt) chips.push(opt.label);
  });
  vibePrefs.forEach(v => {
    chips.push(vibeLabels[v] ?? v);
  });
  neighborhoodPrefs.forEach(n => chips.push(n));

  if (chips.length === 0) return null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={screenStyles.prefChipScroll}
        contentContainerStyle={screenStyles.prefChipContent}
      >
        <View style={screenStyles.prefChipFilterIcon}>
          <Ionicons name="options-outline" size={13} color="#FF3D6B" />
        </View>
        {chips.map((chip, idx) => (
          <View key={idx} style={screenStyles.prefChip}>
            <Text style={screenStyles.prefChipText}>{chip}</Text>
          </View>
        ))}
      </ScrollView>
    </TouchableOpacity>
  );
}

// ─── Create Date Plan Modal ───────────────────────────────────────────────────

const DRINK_TYPES: { type: DrinkVenueType; label: string }[] = [
  { type: 'cocktail_bar', label: 'Cocktail Bar' },
  { type: 'wine_bar',     label: 'Wine Bar' },
  { type: 'rooftop_bar',  label: 'Rooftop' },
  { type: 'speakeasy',    label: 'Speakeasy' },
  { type: 'beer_garden',  label: 'Beer Garden' },
  { type: 'whiskey_bar',  label: 'Whiskey Bar' },
  { type: 'dive_bar',     label: 'Dive Bar' },
];

const CUISINE_TYPES: { type: FoodCuisine; label: string }[] = [
  { type: 'italian',       label: 'Italian' },
  { type: 'japanese',      label: 'Japanese' },
  { type: 'mexican',       label: 'Mexican' },
  { type: 'american',      label: 'American' },
  { type: 'mediterranean', label: 'Mediterranean' },
  { type: 'thai',          label: 'Thai' },
  { type: 'korean',        label: 'Korean' },
  { type: 'french',        label: 'French' },
  { type: 'sushi',         label: 'Sushi' },
  { type: 'steakhouse',    label: 'Steakhouse' },
];

const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM',
  '9:00 PM', '10:00 PM',
];

const DATE_VIBE_OPTS: VibeTag[] = [
  'intimate', 'casual', 'upscale', 'date_night',
  'trendy', 'rooftop', 'outdoor', 'hidden_gem',
];

function CreateDatePlanModal({
  visible,
  onClose,
  currentUserId,
  currentName,
  currentInstagram,
  currentAvailability,
}: {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  currentName: string;
  currentInstagram?: string;
  currentAvailability?: import('../types').AvailabilityVisibility;
}) {
  const { postPlan } = usePublicPlansStore();

  const [actType,         setActType]         = useState<ActivityType>('drinks');
  const [selBarType,      setSelBarType]       = useState<DrinkVenueType | null>(null);
  const [selCuisine,      setSelCuisine]       = useState<FoodCuisine | null>(null);
  const [venue,           setVenue]            = useState('');
  const [neighborhood,    setNeighborhood]     = useState<string | null>(null);
  const [timeStart,       setTimeStart]        = useState<string | null>(null);
  const [selectedVibes,   setSelectedVibes]    = useState<VibeTag[]>([]);
  const [description,     setDescription]      = useState('');
  const [customName,      setCustomName]       = useState('');  // optional override
  const [posting,         setPosting]          = useState(false);

  // Reset form each time modal opens
  useEffect(() => {
    if (visible) {
      setActType('drinks');
      setSelBarType(null);
      setSelCuisine(null);
      setVenue('');
      setNeighborhood(null);
      setTimeStart(null);
      setSelectedVibes([]);
      setDescription('');
      setCustomName('');
      setPosting(false);
    }
  }, [visible]);

  const actLabel = DATE_ACTIVITY_OPTS.find(o => o.type === actType)?.label ?? 'Plan';

  const autoName = useMemo(() => {
    const v = venue.trim();
    if (v) return `${actLabel} at ${v}`;
    if (neighborhood) return `${actLabel} in ${neighborhood}`;
    return actLabel;
  }, [actLabel, venue, neighborhood]);

  const canPost = !!neighborhood && !!timeStart;

  const toggleVibe = (v: VibeTag) =>
    setSelectedVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const handlePost = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    const today = new Date().toISOString().slice(0, 10);
    await postPlan({
      creatorId:                     currentUserId,
      creatorName:                   currentName,
      creatorInstagram:              currentInstagram,
      creatorAvailabilityVisibility: currentAvailability,
      planType:    'exclusive_date',
      visibility:  'public',
      activityType: actType,
      ...(actType === 'drinks' && selBarType  ? { barType: selBarType }   : {}),
      ...(actType === 'dinner' && selCuisine  ? { cuisine: selCuisine }   : {}),
      planName:    customName.trim() || autoName,
      description: description.trim() || undefined,
      neighborhood: neighborhood!,
      date:        today,
      timeStart:   timeStart!,
      vibes:       selectedVibes,
      groupSize:   2,
      maxAttendees: 2,
    });
    setPosting(false);
    onClose();
  };

  const venueHint =
    actType === 'drinks'   ? 'e.g. Employees Only, Amor y Amargo' :
    actType === 'dinner'   ? 'e.g. Via Carota, Don Angie' :
    actType === 'coffee'   ? 'e.g. Maman, Blue Bottle' :
                             'e.g. The High Line, Brooklyn Boulders';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={cdpStyles.safe} edges={['top', 'bottom']}>

        {/* ── Header ── */}
        <View style={cdpStyles.header}>
          <TouchableOpacity onPress={onClose} style={cdpStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={cdpStyles.headerCenter}>
            <LinearGradient
              colors={DATE_GRADIENT}
              style={cdpStyles.headerIconWrap}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flame" size={14} color={colors.textInverse} />
            </LinearGradient>
            <Text style={cdpStyles.headerTitle}>Create Spark Plan</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={cdpStyles.scroll}
            contentContainerStyle={cdpStyles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Plan name (optional, auto-fills) ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>
                Plan name{'  '}
                <Text style={cdpStyles.optLabel}>optional · auto-fills</Text>
              </Text>
              <View style={cdpStyles.inputWrap}>
                <Ionicons name="pencil-outline" size={15} color={colors.textTertiary} />
                <TextInput
                  style={cdpStyles.venueInput}
                  placeholder={autoName || 'e.g. Drinks at Employees Only'}
                  placeholderTextColor={colors.textTertiary}
                  value={customName}
                  onChangeText={setCustomName}
                  returnKeyType="done"
                />
                {customName.length > 0 && (
                  <TouchableOpacity onPress={() => setCustomName('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Activity type ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>Activity</Text>
              <View style={cdpStyles.actGrid}>
                {DATE_ACTIVITY_OPTS.map(opt => {
                  const active = actType === opt.type;
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      style={[cdpStyles.actChip, active && cdpStyles.actChipActive]}
                      onPress={() => { setActType(opt.type); setSelBarType(null); setSelCuisine(null); }}
                      activeOpacity={0.8}
                    >
                      {active && (
                        <LinearGradient
                          colors={DATE_GRADIENT}
                          style={StyleSheet.absoluteFillObject}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      )}
                      <Ionicons
                        name={opt.icon as any}
                        size={15}
                        color={active ? colors.textInverse : colors.textSecondary}
                      />
                      <Text style={[cdpStyles.actChipText, active && cdpStyles.actChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Bar type (drinks only) ── */}
            {actType === 'drinks' && (
              <View style={cdpStyles.section}>
                <Text style={cdpStyles.sectionLabel}>
                  Bar type{'  '}
                  <Text style={cdpStyles.optLabel}>optional</Text>
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={cdpStyles.hScroll}
                >
                  {DRINK_TYPES.map(d => {
                    const active = selBarType === d.type;
                    return (
                      <TouchableOpacity
                        key={d.type}
                        style={[cdpStyles.pill, active && cdpStyles.pillActive]}
                        onPress={() => setSelBarType(active ? null : d.type)}
                        activeOpacity={0.8}
                      >
                        <Text style={[cdpStyles.pillText, active && cdpStyles.pillTextActive]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Cuisine (dinner only) ── */}
            {actType === 'dinner' && (
              <View style={cdpStyles.section}>
                <Text style={cdpStyles.sectionLabel}>
                  Cuisine{'  '}
                  <Text style={cdpStyles.optLabel}>optional</Text>
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={cdpStyles.hScroll}
                >
                  {CUISINE_TYPES.map(c => {
                    const active = selCuisine === c.type;
                    return (
                      <TouchableOpacity
                        key={c.type}
                        style={[cdpStyles.pill, active && cdpStyles.pillActive]}
                        onPress={() => setSelCuisine(active ? null : c.type)}
                        activeOpacity={0.8}
                      >
                        <Text style={[cdpStyles.pillText, active && cdpStyles.pillTextActive]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Specific spot ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>
                Specific spot{'  '}
                <Text style={cdpStyles.optLabel}>optional</Text>
              </Text>
              <View style={cdpStyles.inputWrap}>
                <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={cdpStyles.venueInput}
                  placeholder={venueHint}
                  placeholderTextColor={colors.textTertiary}
                  value={venue}
                  onChangeText={setVenue}
                  autoCorrect={false}
                  returnKeyType="done"
                />
                {venue.length > 0 && (
                  <TouchableOpacity onPress={() => setVenue('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Neighborhood ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>
                Neighborhood{'  '}
                <Text style={cdpStyles.reqLabel}>*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={cdpStyles.hScroll}
              >
                {NYC_NEIGHBORHOODS.map(n => {
                  const active = neighborhood === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[cdpStyles.pill, active && cdpStyles.pillActive]}
                      onPress={() => setNeighborhood(active ? null : n)}
                      activeOpacity={0.8}
                    >
                      <Text style={[cdpStyles.pillText, active && cdpStyles.pillTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── When ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>
                When{'  '}
                <Text style={cdpStyles.reqLabel}>*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={cdpStyles.hScroll}
              >
                {TIME_SLOTS.map(t => {
                  const active = timeStart === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[cdpStyles.pill, active && cdpStyles.pillActive]}
                      onPress={() => setTimeStart(active ? null : t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[cdpStyles.pillText, active && cdpStyles.pillTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Vibes ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>
                Vibes{'  '}
                <Text style={cdpStyles.optLabel}>optional</Text>
              </Text>
              <View style={cdpStyles.chipWrap}>
                {DATE_VIBE_OPTS.map(v => {
                  const active = selectedVibes.includes(v);
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[cdpStyles.pill, active && cdpStyles.pillActive]}
                      onPress={() => toggleVibe(v)}
                      activeOpacity={0.8}
                    >
                      <Text style={[cdpStyles.pillText, active && cdpStyles.pillTextActive]}>
                        {vibeLabels[v] ?? v}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Description ── */}
            <View style={cdpStyles.section}>
              <Text style={cdpStyles.sectionLabel}>
                About this plan{'  '}
                <Text style={cdpStyles.optLabel}>optional</Text>
              </Text>
              <TextInput
                style={cdpStyles.descInput}
                placeholder="What are you looking for? Easy conversation, good energy..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* ── Details summary (when & neighborhood filled) ── */}
            {timeStart && neighborhood ? (
              <View style={cdpStyles.previewCard}>
                <Text style={cdpStyles.previewName}>{customName.trim() || autoName}</Text>
                <Text style={cdpStyles.previewMeta}>
                  Today · {timeStart} · {neighborhood}
                </Text>
              </View>
            ) : null}

          </ScrollView>

          {/* ── Post footer ── */}
          <View style={cdpStyles.footer}>
            <LinearGradient
              colors={canPost ? DATE_GRADIENT : (['#C4C4C4', '#C4C4C4'] as [string, string])}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cdpStyles.postGrad}
            >
              <TouchableOpacity
                style={cdpStyles.postInner}
                onPress={handlePost}
                disabled={!canPost || posting}
                activeOpacity={0.85}
              >
                <Ionicons name="flame" size={16} color={colors.textInverse} />
                <Text style={cdpStyles.postText}>
                  {posting ? 'Posting…' : 'Post Spark Plan'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
            {!canPost && (
              <Text style={cdpStyles.postHint}>Select a neighborhood and time to post</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const cdpStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIconWrap: {
    width: 26, height: 26,
    borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },

  // Scroll
  scroll: { flex: 1 },
  content: { paddingBottom: spacing['2xl'] },

  // Sections
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.1,
  },
  optLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  reqLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FF3D6B',
  },

  // Activity chips (2-up grid)
  actGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    minWidth: '47%',
    flex: 1,
    justifyContent: 'center',
  },
  actChipActive: { borderColor: 'transparent' },
  actChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  actChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },

  // Horizontal scroll row of pills
  hScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillActive: {
    backgroundColor: '#FF3D6B18',
    borderColor: '#FF3D6B',
  },
  pillText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#FF3D6B',
    fontWeight: typography.weights.bold,
  },

  // Wrapping chip grid (vibes)
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Venue text input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  venueInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },

  // Description
  descInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
    minHeight: 80,
    lineHeight: 21,
  },

  // Plan name preview card
  previewCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    backgroundColor: '#FF3D6B08',
    borderWidth: 1,
    borderColor: '#FF3D6B22',
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: 4,
  },
  previewLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.3,
  },
  previewMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  postGrad: { borderRadius: radii.xl, overflow: 'hidden' },
  postInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
  },
  postText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
  postHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DatingTab = 'discover' | 'myplans';

export default function DatingScreen() {
  const navigation = useNavigation<Nav>();
  const { plans, fetchPlans } = usePublicPlansStore();
  const { user } = useAuthStore();
  const { activityPrefs, vibePrefs, neighborhoodPrefs } = usePreferencesStore();
  const { lat, lon } = useLocation();
  const { weather } = useWeather(lat ?? undefined, lon ?? undefined);

  const heroBg = getWeatherBg(
    weather?.current.description ?? '',
    weather?.current.isGoodWeather ?? true,
    new Date().getHours(),
  );

  const [showPrefs,        setShowPrefs]        = useState(false);
  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [activeTab,        setActiveTab]        = useState<DatingTab>('discover');

  const currentUserId = user?.id ?? '';
  const currentName = user?.name ?? 'You';
  const currentInstagram = user?.instagram;

  useEffect(() => {
    if (currentUserId) fetchPlans(currentUserId);
  }, [currentUserId]);

  const datePlans = plans.filter(p => p.planType === 'exclusive_date');
  const myPlans = datePlans.filter(p => p.creatorId === currentUserId);
  const hasMyPending = myPlans.some(p => p.interestedUsers.some(u => u.status === 'pending'));

  const discoverPlans = datePlans
    .filter(p => p.creatorId !== currentUserId)
    .filter(p => {
      if (activityPrefs.length > 0 && !activityPrefs.includes(p.activityType)) return false;
      if (vibePrefs.length > 0 && !p.vibes.some(v => vibePrefs.includes(v))) return false;
      if (neighborhoodPrefs.length > 0 && !neighborhoodPrefs.includes(p.neighborhood)) return false;
      return true;
    });

  const hasActiveFilters =
    activityPrefs.length > 0 || vibePrefs.length > 0 || neighborhoodPrefs.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={heroBg} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      <SafeAreaView style={[screenStyles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={screenStyles.header}>
        <View style={screenStyles.headerLeft}>
          <Text style={screenStyles.title}>Spark</Text>
          <Text style={screenStyles.subtitle}>Date plans & 1:1 meetups</Text>
        </View>
        <View style={screenStyles.headerActions}>
          {activeTab === 'discover' && (
            <TouchableOpacity
              style={screenStyles.headerIconBtn}
              onPress={() => setShowPrefs(true)}
              activeOpacity={0.8}
            >
              {hasActiveFilters && <View style={screenStyles.filterDot} />}
              <Ionicons name="options-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={screenStyles.headerPostBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={DATE_GRADIENT}
              style={screenStyles.headerPostGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab switcher ── */}
      <View style={screenStyles.tabRow}>
        {(['discover', 'myplans'] as DatingTab[]).map(tab => {
          const active = activeTab === tab;
          const label = tab === 'discover' ? 'Discover' : 'My Plans';
          const showDot = tab === 'myplans' && hasMyPending;
          return (
            <TouchableOpacity
              key={tab}
              style={[screenStyles.tabBtn, active && screenStyles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              {active ? (
                <LinearGradient
                  colors={DATE_GRADIENT}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              ) : null}
              <Text style={[screenStyles.tabBtnText, active && screenStyles.tabBtnTextActive]}>
                {label}
              </Text>
              {showDot && (
                <View style={[screenStyles.tabDot, active && screenStyles.tabDotActive]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={screenStyles.scroll}
        contentContainerStyle={screenStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Discover tab ── */}
        {activeTab === 'discover' && (
          <>
            <ActivePreferenceChips onPress={() => setShowPrefs(true)} />
            {discoverPlans.length === 0 ? (
              <View style={screenStyles.empty}>
                <LinearGradient
                  colors={DATE_GRADIENT}
                  style={screenStyles.emptyIconWrap}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="heart-outline" size={32} color={colors.textInverse} />
                </LinearGradient>
                <Text style={screenStyles.emptyText}>
                  {hasActiveFilters ? 'No plans match your filters' : 'No date plans yet'}
                </Text>
                <Text style={screenStyles.emptySubtext}>
                  {hasActiveFilters
                    ? 'Try adjusting your preferences or post one yourself.'
                    : 'Be the first to post a date plan.'}
                </Text>
                <View style={screenStyles.emptyActions}>
                  {hasActiveFilters && (
                    <TouchableOpacity
                      style={screenStyles.emptyAdjustBtn}
                      onPress={() => setShowPrefs(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="options-outline" size={15} color="#FF3D6B" />
                      <Text style={screenStyles.emptyAdjustText}>Adjust filters</Text>
                    </TouchableOpacity>
                  )}
                  <LinearGradient
                    colors={DATE_GRADIENT}
                    style={screenStyles.emptyPostGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity
                      style={screenStyles.emptyPostInner}
                      onPress={() => setShowCreateModal(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={screenStyles.emptyPostText}>Post a date plan</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </View>
            ) : (
              discoverPlans.map(plan => (
                <DatePlanCard
                  key={plan.id}
                  plan={plan}
                  currentUserId={currentUserId}
                  currentName={currentName}
                  currentInstagram={currentInstagram}
                  onCreatorPress={() =>
                    navigation.navigate('UserProfile', {
                      userId: plan.creatorId,
                      name: plan.creatorName,
                      photo: plan.creatorPhoto,
                      instagram: plan.creatorInstagram,
                    })
                  }
                />
              ))
            )}
          </>
        )}

        {/* ── My Plans tab ── */}
        {activeTab === 'myplans' && (
          <>
            {myPlans.length === 0 ? (
              <View style={screenStyles.empty}>
                <LinearGradient
                  colors={DATE_GRADIENT}
                  style={screenStyles.emptyIconWrap}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="calendar-outline" size={32} color={colors.textInverse} />
                </LinearGradient>
                <Text style={screenStyles.emptyText}>No date plans posted yet</Text>
                <Text style={screenStyles.emptySubtext}>
                  Post a date plan and see who's interested.
                </Text>
                <LinearGradient
                  colors={DATE_GRADIENT}
                  style={[screenStyles.emptyPostGrad, { marginTop: spacing.sm, alignSelf: 'stretch' }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    style={screenStyles.emptyPostInner}
                    onPress={() => setShowCreateModal(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={screenStyles.emptyPostText}>Post a date plan</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              myPlans.map(plan => (
                <MyDatePlanCard
                  key={plan.id}
                  plan={plan}
                  currentUserId={currentUserId}
                  currentName={currentName}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <PreferencesModal visible={showPrefs} onClose={() => setShowPrefs(false)} />

      <CreateDatePlanModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUserId={currentUserId}
        currentName={currentName}
        currentInstagram={currentInstagram}
        currentAvailability={user?.availabilityVisibility}
      />
      </SafeAreaView>
    </View>
  );
}

// ─── Screen Styles ────────────────────────────────────────────────────────────

const screenStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },

  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  tabBtnActive: { overflow: 'hidden' },
  tabBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  tabDot: {
    width: 7, height: 7,
    borderRadius: radii.full,
    backgroundColor: '#FF3D6B',
  },
  tabDotActive: { backgroundColor: 'rgba(255,255,255,0.85)' },
  headerLeft: { flex: 1 },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: '#FF3D6B',
    zIndex: 1,
  },
  headerPostBtn: {
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.md,
  },
  headerPostGrad: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },

  // Active pref chips
  prefChipScroll: { marginHorizontal: spacing.base, marginBottom: spacing.base },
  prefChipContent: { gap: spacing.xs, alignItems: 'center' },
  prefChipFilterIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: '#FF3D6B12',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3D6B30',
  },
  prefChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    backgroundColor: '#FF3D6B12',
    borderWidth: 1,
    borderColor: '#FF3D6B30',
  },
  prefChipText: {
    fontSize: typography.sizes.xs,
    color: '#FF3D6B',
    fontWeight: typography.weights.semibold,
  },

  // Empty state
  empty: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  emptyAdjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: '#FF3D6B50',
    backgroundColor: '#FF3D6B08',
  },
  emptyAdjustText: {
    fontSize: typography.sizes.base,
    color: '#FF3D6B',
    fontWeight: typography.weights.semibold,
  },
  emptyPostGrad: { borderRadius: radii.xl, overflow: 'hidden' },
  emptyPostInner: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPostText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
});
