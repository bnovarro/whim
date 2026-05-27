import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, Linking, Alert, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  PublicPlan, ActivityType, FoodCuisine, DrinkVenueType,
  PlanType, PlanVisibility, VibeTag,
} from '../types';
import { usePublicPlansStore } from '../store/publicPlansStore';
import { useAuthStore } from '../store/authStore';
import { useWeather } from '../hooks/useWeather';
import { useLocation } from '../hooks/useLocation';
import {
  colors, typography, spacing, radii, shadows,
  activityColors, activityIcons, vibeLabels,
  cuisineLabels, drinkTypeLabels, planTypeConfig, getWeatherBg,
} from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useFriendsStore, FriendData } from '../store/friendsStore';
import { DayAvailability } from '../types';
import GradientBackground from '../components/GradientBackground';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planSubLabel(plan: PublicPlan): string {
  if (plan.activityType === 'dinner' && plan.cuisine) return cuisineLabels[plan.cuisine] ?? '';
  if (plan.activityType === 'drinks' && plan.barType) return drinkTypeLabels[plan.barType] ?? '';
  if (plan.activityType === 'watch_sports') return 'Watch Sports';
  if (plan.activityType === 'sports') return 'Live Events';
  return plan.activityType.charAt(0).toUpperCase() + plan.activityType.slice(1);
}

// ─── Avatar + availability dot ────────────────────────────────────────────────

const AVATAR_GRADS: Array<[string, string]> = [
  ['#FF6B35', '#FF3D6B'],   // orange → rose
  ['#FF8C42', '#FF6B9D'],   // amber → pink
  ['#F97316', '#EC4899'],   // warm orange → magenta pink
  ['#FF9A56', '#FF5E8A'],   // peach → warm rose
  ['#E55A25', '#FF3D6B'],   // deep orange → hot rose
  ['#FFAA6B', '#FF6B9D'],   // light peach → soft pink
  ['#FF6B6B', '#C026D3'],   // coral → violet
];
function nameGrad(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADS[Math.abs(h) % AVATAR_GRADS.length];
}

function Avatar({
  name, size = 44, photo, isAvailable, showDot = false,
}: {
  name: string; size?: number; photo?: string;
  isAvailable?: boolean; showDot?: boolean;
}) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const grad = nameGrad(name);
  const DOT = Math.max(10, size * 0.24);

  const inner = photo ? (
    <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, resizeMode: 'cover' }} />
  ) : (
    <LinearGradient
      colors={grad}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: '#fff' }}>{initials}</Text>
    </LinearGradient>
  );

  if (!showDot) return inner;

  return (
    <View style={{ width: size, height: size }}>
      {inner}
      <View style={[
        styles.availDot,
        { width: DOT, height: DOT, borderRadius: DOT / 2, bottom: -1, right: -1 },
        isAvailable ? styles.availDotFree : styles.availDotBusy,
      ]} />
    </View>
  );
}

// ─── "Who's Free Today" strip ─────────────────────────────────────────────────

function WhosFreeStrip({
  plans, currentUserId, onPress,
}: {
  plans: PublicPlan[];
  currentUserId: string;
  onPress: (userId: string, name: string, photo?: string, instagram?: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // Users who have plans today (busy)
  const busyIds = new Set<string>();
  plans.filter(p => p.date === today).forEach(p => {
    busyIds.add(p.creatorId);
    p.interestedUsers.filter(u => u.status === 'accepted').forEach(u => busyIds.add(u.userId));
  });

  // Unique creators across all plans with public/friends visibility
  const seen = new Set<string>();
  const freeUsers: Array<{ id: string; name: string; photo?: string; instagram?: string }> = [];
  plans.forEach(p => {
    if (p.creatorId === currentUserId || seen.has(p.creatorId)) return;
    const visib = p.creatorAvailabilityVisibility ?? 'private';
    if (visib === 'private') return;
    seen.add(p.creatorId);
    if (!busyIds.has(p.creatorId)) {
      freeUsers.push({ id: p.creatorId, name: p.creatorName, photo: p.creatorPhoto, instagram: p.creatorInstagram });
    }
  });

  if (freeUsers.length === 0) return null;

  return (
    <View style={styles.freeStripWrap}>
      <Text style={styles.freeStripLabel}>🟢  Free today</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freeStripScroll}>
        {freeUsers.map(u => (
          <TouchableOpacity key={u.id} style={styles.freeChip} onPress={() => onPress(u.id, u.name, u.photo, u.instagram)} activeOpacity={0.75}>
            <Avatar name={u.name} size={38} photo={u.photo} />
            <Text style={styles.freeChipName} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Friends Section ─────────────────────────────────────────────────────────

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getWeekDayLetters(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return DAY_LETTERS[d.getDay()];
  });
}

function FriendCard({
  friend, dayLetters, onPress,
}: {
  friend: FriendData;
  dayLetters: string[];
  onPress: () => void;
}) {
  const showAvail = friend.availabilityVisibility !== 'private';
  const todayAvail: DayAvailability = showAvail ? friend.weekAvailability[0] : 'unknown';
  const firstName = friend.name.split(' ')[0];

  return (
    <TouchableOpacity style={fStyles.card} onPress={onPress} activeOpacity={0.8}>
      <Avatar
        name={friend.name}
        size={52}
        photo={friend.photo}
        showDot={showAvail}
        isAvailable={todayAvail === 'free'}
      />
      <Text style={fStyles.name} numberOfLines={1}>{firstName}</Text>

      {/* 7-day mini calendar */}
      <View style={fStyles.weekRow}>
        {dayLetters.map((letter, idx) => {
          const avail: DayAvailability = showAvail ? friend.weekAvailability[idx] : 'unknown';
          const isToday = idx === 0;
          return (
            <View key={idx} style={fStyles.dayCol}>
              <Text style={[fStyles.dayLetter, isToday && fStyles.dayLetterToday]}>{letter}</Text>
              <View style={[
                fStyles.dayDot,
                avail === 'free' ? fStyles.dotFree :
                avail === 'busy' ? fStyles.dotBusy :
                fStyles.dotUnknown,
              ]} />
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

function FriendsSection({
  friends, onPress,
}: {
  friends: FriendData[];
  onPress: (friend: FriendData) => void;
}) {
  const dayLetters = useMemo(getWeekDayLetters, []);

  return (
    <View style={fStyles.sectionWrap}>
      <View style={fStyles.sectionHeader}>
        <Text style={fStyles.sectionTitle}>FRIENDS</Text>
        <Text style={fStyles.sectionCount}>{friends.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={fStyles.scroll}
      >
        {friends.map(friend => (
          <FriendCard
            key={friend.id}
            friend={friend}
            dayLetters={dayLetters}
            onPress={() => onPress(friend)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Quick Chat Modal ─────────────────────────────────────────────────────────

function QuickChatModal({
  visible, onClose, planId, otherUserId, otherName, currentUserId, currentName,
}: {
  visible: boolean; onClose: () => void;
  planId: string; otherUserId: string; otherName: string;
  currentUserId: string; currentName: string;
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={chatStyles.safe} edges={['top', 'bottom']}>
        {/* Header */}
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

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={chatStyles.messageList}
          contentContainerStyle={chatStyles.messageContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && (
            <Text style={chatStyles.emptyChat}>Say hi — you're matched on this plan.</Text>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === currentUserId;
            return (
              <View key={msg.id} style={[chatStyles.bubble, isMe ? chatStyles.bubbleMe : chatStyles.bubbleThem]}>
                <Text style={[chatStyles.bubbleText, isMe && chatStyles.bubbleTextMe]}>{msg.text}</Text>
                <Text style={chatStyles.bubbleTime}>
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
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
              <Ionicons name="send" size={18} color={text.trim() ? colors.textInverse : colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Interested Users Modal ───────────────────────────────────────────────────

function InterestedModal({
  visible, onClose, plan, currentUserId, currentName,
}: {
  visible: boolean; onClose: () => void;
  plan: PublicPlan; currentUserId: string; currentName: string;
}) {
  const { acceptInterest, declineInterest } = usePublicPlansStore();
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string } | null>(null);
  const pending = plan.interestedUsers.filter(u => u.status === 'pending');
  const accepted = plan.interestedUsers.filter(u => u.status === 'accepted');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            <View style={intStyles.empty}>
              <Ionicons name="heart-outline" size={36} color={colors.textTertiary} />
              <Text style={intStyles.emptyText}>No one has expressed interest yet.</Text>
              <Text style={intStyles.emptySubtext}>Share your plan to get more visibility.</Text>
            </View>
          )}

          {pending.length > 0 && (
            <View style={intStyles.group}>
              <Text style={intStyles.groupLabel}>Pending ({pending.length})</Text>
              {pending.map(u => (
                <View key={u.userId} style={intStyles.row}>
                  <Avatar name={u.name} size={42} />
                  <View style={intStyles.rowInfo}>
                    <Text style={intStyles.rowName}>{u.name}</Text>
                    {u.instagram && (
                      <TouchableOpacity onPress={() => Linking.openURL(`https://instagram.com/${u.instagram}`)}>
                        <Text style={intStyles.rowIg}>@{u.instagram}</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={intStyles.rowTime}>{formatDistanceToNow(new Date(u.requestedAt), { addSuffix: true })}</Text>
                  </View>
                  <View style={intStyles.rowActions}>
                    <TouchableOpacity
                      style={intStyles.acceptBtn}
                      onPress={() => acceptInterest(plan.id, u.userId)}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={intStyles.declineBtn}
                      onPress={() => declineInterest(plan.id, u.userId)}
                    >
                      <Ionicons name="close" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {accepted.length > 0 && (
            <View style={intStyles.group}>
              <Text style={intStyles.groupLabel}>Matched ({accepted.length})</Text>
              {accepted.map(u => (
                <View key={u.userId} style={intStyles.row}>
                  <Avatar name={u.name} size={42} />
                  <View style={intStyles.rowInfo}>
                    <Text style={intStyles.rowName}>{u.name}</Text>
                    {u.instagram && (
                      <TouchableOpacity onPress={() => Linking.openURL(`https://instagram.com/${u.instagram}`)}>
                        <Text style={intStyles.rowIg}>@{u.instagram}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={intStyles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={intStyles.matchText}>Matched</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={intStyles.chatBtn}
                    onPress={() => setChatTarget({ userId: u.userId, name: u.name })}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
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

// ─── Post Plan Modal ──────────────────────────────────────────────────────────

const ACTIVITY_OPTS: { type: ActivityType; label: string; icon: string }[] = [
  { type: 'drinks', label: 'Drinks', icon: 'wine-outline' },
  { type: 'dinner', label: 'Food', icon: 'restaurant-outline' },
  { type: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
  { type: 'activity', label: 'Activity', icon: 'flash-outline' },
  { type: 'watch_sports', label: 'Sports', icon: 'tv-outline' },
];

const CUISINE_OPTS: FoodCuisine[] = [
  'italian', 'japanese', 'korean', 'mexican', 'mediterranean',
  'thai', 'american', 'indian', 'french', 'chinese', 'pizza', 'sushi', 'brunch', 'steakhouse', 'caribbean',
];

const BAR_OPTS: DrinkVenueType[] = [
  'cocktail_bar', 'wine_bar', 'rooftop_bar', 'speakeasy', 'dive_bar',
  'beer_garden', 'sports_bar', 'whiskey_bar',
];

const TIME_OPTS = [
  { label: 'Afternoon', start: '2:00 PM', end: '5:00 PM' },
  { label: 'After work', start: '6:00 PM', end: '8:00 PM' },
  { label: 'Evening', start: '7:00 PM', end: '10:00 PM' },
  { label: 'Late night', start: '9:00 PM', end: '12:00 AM' },
  { label: 'Brunch', start: '11:00 AM', end: '2:00 PM' },
];

const NEIGHBORHOODS = [
  'West Village', 'East Village', 'SoHo', 'Williamsburg', 'Brooklyn Heights',
  'Chelsea', 'Midtown', 'Lower East Side', 'Nolita', 'Tribeca',
  'Koreatown', 'Financial District', 'Greenpoint', 'Park Slope', 'Bushwick',
];

function PostPlanModal({
  visible, onClose, currentUserId, currentName, currentInstagram, currentPhoto,
}: {
  visible: boolean; onClose: () => void;
  currentUserId: string; currentName: string; currentInstagram?: string; currentPhoto?: string;
}) {
  const { postPlan } = usePublicPlansStore();
  const [step, setStep] = useState(0);
  const [planName, setPlanName] = useState('');
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const [cuisine, setCuisine] = useState<FoodCuisine | null>(null);
  const [barType, setBarType] = useState<DrinkVenueType | null>(null);
  const [neighborhood, setNeighborhood] = useState('');
  const [timeSlot, setTimeSlot] = useState<typeof TIME_OPTS[0] | null>(null);
  const [description, setDescription] = useState('');
  const [planType, setPlanType] = useState<PlanType>('open');
  const [visibility, setVisibility] = useState<PlanVisibility>('public');

  const reset = () => {
    setStep(0); setPlanName(''); setActivity(null); setCuisine(null);
    setBarType(null); setNeighborhood(''); setTimeSlot(null);
    setDescription(''); setPlanType('open'); setVisibility('public');
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePost = () => {
    if (!activity || !neighborhood || !timeSlot || !planName.trim()) {
      Alert.alert('Missing info', 'Fill in the plan name, activity, neighborhood, and time.');
      return;
    }
    postPlan({
      creatorId: currentUserId,
      creatorName: currentName,
      creatorInstagram: currentInstagram,
      creatorPhoto: currentPhoto,
      planType,
      visibility,
      activityType: activity,
      cuisine: cuisine ?? undefined,
      barType: barType ?? undefined,
      planName: planName.trim(),
      description: description.trim() || undefined,
      neighborhood,
      date: format(new Date(), 'yyyy-MM-dd'),
      timeStart: timeSlot.start,
      vibes: [],
      groupSize: planType === 'exclusive_date' ? 2 : 6,
      maxAttendees: planType === 'exclusive_date' ? 2 : undefined,
    });
    handleClose();
  };

  const canPost = !!activity && !!neighborhood && !!timeSlot && !!planName.trim();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={postStyles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={postStyles.header}>
          <TouchableOpacity onPress={handleClose} style={postStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={postStyles.title}>Post a Plan</Text>
          <TouchableOpacity
            onPress={handlePost}
            style={[postStyles.postBtn, !canPost && postStyles.postBtnDisabled]}
            disabled={!canPost}
          >
            <Text style={[postStyles.postBtnText, !canPost && postStyles.postBtnTextDisabled]}>Post</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={postStyles.content} keyboardShouldPersistTaps="handled">

          {/* Plan name */}
          <Text style={postStyles.label}>Plan name</Text>
          <TextInput
            style={postStyles.input}
            placeholder="e.g. Drinks at Westlight, KBBQ in Koreatown..."
            placeholderTextColor={colors.textTertiary}
            value={planName}
            onChangeText={setPlanName}
          />

          {/* Plan type */}
          <Text style={postStyles.label}>What kind of plan?</Text>
          <View style={postStyles.typeRow}>
            {(['exclusive_date', 'group_hangout', 'open'] as PlanType[]).map(t => {
              const cfg = planTypeConfig[t];
              const active = planType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[postStyles.typeCard, active && { borderColor: cfg.gradient[0], borderWidth: 2 }]}
                  onPress={() => setPlanType(t)}
                  activeOpacity={0.8}
                >
                  {active && (
                    <LinearGradient colors={cfg.gradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  )}
                  <Ionicons name={cfg.icon as any} size={20} color={active ? colors.textInverse : colors.primary} />
                  <Text style={[postStyles.typeLabel, active && { color: colors.textInverse }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Activity */}
          <Text style={postStyles.label}>Activity</Text>
          <View style={postStyles.activityRow}>
            {ACTIVITY_OPTS.map(opt => {
              const active = activity === opt.type;
              const grad = (activityColors[opt.type] ?? colors.gradients.primary) as [string, string];
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[postStyles.activityChip, active && { borderColor: 'transparent' }]}
                  onPress={() => { setActivity(opt.type); setCuisine(null); setBarType(null); }}
                  activeOpacity={0.8}
                >
                  {active && <LinearGradient colors={grad} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
                  <Ionicons name={opt.icon as any} size={16} color={active ? colors.textInverse : colors.text} />
                  <Text style={[postStyles.activityChipText, active && { color: colors.textInverse }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cuisine subcategory */}
          {activity === 'dinner' && (
            <>
              <Text style={postStyles.sublabel}>Cuisine</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={postStyles.subRow}>
                {CUISINE_OPTS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[postStyles.subChip, cuisine === c && postStyles.subChipActive]}
                    onPress={() => setCuisine(c === cuisine ? null : c)}
                  >
                    <Text style={[postStyles.subChipText, cuisine === c && postStyles.subChipTextActive]}>
                      {cuisineLabels[c]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Bar type subcategory */}
          {activity === 'drinks' && (
            <>
              <Text style={postStyles.sublabel}>Type of bar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={postStyles.subRow}>
                {BAR_OPTS.map(b => (
                  <TouchableOpacity
                    key={b}
                    style={[postStyles.subChip, barType === b && postStyles.subChipActive]}
                    onPress={() => setBarType(b === barType ? null : b)}
                  >
                    <Text style={[postStyles.subChipText, barType === b && postStyles.subChipTextActive]}>
                      {drinkTypeLabels[b]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Neighborhood */}
          <Text style={postStyles.label}>Neighborhood</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={postStyles.subRow}>
            {NEIGHBORHOODS.map(n => (
              <TouchableOpacity
                key={n}
                style={[postStyles.subChip, neighborhood === n && postStyles.subChipActive]}
                onPress={() => setNeighborhood(n === neighborhood ? '' : n)}
              >
                <Text style={[postStyles.subChipText, neighborhood === n && postStyles.subChipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Time */}
          <Text style={postStyles.label}>Time</Text>
          <View style={postStyles.timeRow}>
            {TIME_OPTS.map(t => (
              <TouchableOpacity
                key={t.label}
                style={[postStyles.timeChip, timeSlot?.label === t.label && postStyles.timeChipActive]}
                onPress={() => setTimeSlot(t.label === timeSlot?.label ? null : t)}
              >
                <Text style={[postStyles.timeChipText, timeSlot?.label === t.label && postStyles.timeChipTextActive]}>{t.label}</Text>
                <Text style={[postStyles.timeChipSub, timeSlot?.label === t.label && postStyles.timeChipSubActive]}>{t.start}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={postStyles.label}>Description <Text style={postStyles.optional}>(optional)</Text></Text>
          <TextInput
            style={[postStyles.input, postStyles.inputMulti]}
            placeholder="What's the vibe? Who are you hoping to meet?"
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Visibility */}
          <Text style={postStyles.label}>Who can see this?</Text>
          <View style={postStyles.visRow}>
            {([
              { val: 'public' as PlanVisibility, label: 'Everyone', icon: 'globe-outline' },
              { val: 'friends' as PlanVisibility, label: 'Friends', icon: 'people-outline' },
              { val: 'specific' as PlanVisibility, label: 'Invite only', icon: 'lock-closed-outline' },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.val}
                style={[postStyles.visChip, visibility === opt.val && postStyles.visChipActive]}
                onPress={() => setVisibility(opt.val)}
              >
                <Ionicons name={opt.icon as any} size={16} color={visibility === opt.val ? colors.primary : colors.textTertiary} />
                <Text style={[postStyles.visChipText, visibility === opt.val && postStyles.visChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, currentUserId, currentName, currentInstagram, onCreatorPress, creatorIsBusy,
}: {
  plan: PublicPlan;
  currentUserId: string;
  currentName: string;
  currentInstagram?: string;
  onCreatorPress?: () => void;
  creatorIsBusy?: boolean;
}) {
  const { expressInterest, withdrawInterest, joinPlan, leavePlan, userDeclinePlan } = usePublicPlansStore();
  const [interestedModal, setInterestedModal] = useState(false);
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string } | null>(null);

  const isMyPlan = plan.creatorId === currentUserId;
  const gradient = (activityColors[plan.activityType] ?? colors.gradients.primary) as [string, string];
  const icon = activityIcons[plan.activityType] ?? 'flash-outline';
  const subLabel = planSubLabel(plan);
  const cfg = planTypeConfig[plan.planType];
  const pendingCount = plan.interestedUsers.filter(u => u.status === 'pending').length;
  const acceptedMatches = plan.interestedUsers.filter(u => u.status === 'accepted');
  const spotsLeft = plan.maxAttendees ? plan.maxAttendees - plan.attendeeCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const timeAgo = formatDistanceToNow(new Date(plan.createdAt), { addSuffix: true });

  const myAcceptedMatch   = acceptedMatches.find(u => u.userId === currentUserId);
  const myInterestRow     = plan.interestedUsers.find(u => u.userId === currentUserId);
  const hasUserDeclined   = myInterestRow?.status === 'user_declined';
  const userDeclinedCount = isMyPlan ? plan.interestedUsers.filter(u => u.status === 'user_declined').length : 0;

  const showAvailDot = (plan.creatorAvailabilityVisibility ?? 'private') !== 'private';
  const creatorIsAvailable = !creatorIsBusy;

  const handleInterest = () => {
    if (plan.hasExpressedInterest) {
      withdrawInterest(plan.id, currentUserId);
    } else {
      expressInterest(plan.id, currentUserId, currentName, currentInstagram);
    }
  };

  const handleJoin = () => {
    if (plan.isJoined) leavePlan(plan.id, currentUserId);
    else if (!isFull) joinPlan(plan.id, currentUserId, currentName, currentInstagram);
  };

  return (
    <View style={styles.card}>
      {/* Plan type badge */}
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.typeBadge}
      >
        <Ionicons name={cfg.icon as any} size={11} color="rgba(255,255,255,0.95)" />
        <Text style={styles.typeBadgeText}>{cfg.label}</Text>
      </LinearGradient>

      {/* Poster row — tappable to view profile */}
      <TouchableOpacity
        style={styles.posterRow}
        onPress={onCreatorPress}
        activeOpacity={onCreatorPress ? 0.7 : 1}
        disabled={!onCreatorPress}
      >
        <Avatar
          name={plan.creatorName}
          size={46}
          photo={plan.creatorPhoto}
          showDot={showAvailDot}
          isAvailable={creatorIsAvailable}
        />
        <View style={styles.posterInfo}>
          <Text style={styles.posterName}>{plan.creatorName}</Text>
          {plan.creatorInstagram ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`https://instagram.com/${plan.creatorInstagram}`)}
              style={styles.igRow}
            >
              <Ionicons name="logo-instagram" size={12} color={colors.textTertiary} />
              <Text style={styles.igHandle}>@{plan.creatorInstagram}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </TouchableOpacity>

      {/* Activity pill + plan name */}
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activityPill}>
        <Ionicons name={icon as any} size={12} color="rgba(255,255,255,0.95)" />
        <Text style={styles.activityPillText}>{subLabel}</Text>
      </LinearGradient>

      <Text style={styles.planName}>{plan.planName}</Text>

      {plan.description ? (
        <Text style={styles.description} numberOfLines={2}>{plan.description}</Text>
      ) : null}

      {/* Details row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.detailText}>{plan.neighborhood}</Text>
        </View>
        <View style={styles.detailSep} />
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.detailText}>{plan.timeStart}</Text>
        </View>
        {!isMyPlan && (
          <>
            <View style={styles.detailSep} />
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.detailText}>
                {plan.attendeeCount}{plan.maxAttendees ? `/${plan.maxAttendees}` : ''} going
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Vibe tags */}
      {plan.vibes.length > 0 && (
        <View style={styles.vibesRow}>
          {plan.vibes.slice(0, 3).map(v => (
            <View key={v} style={styles.vibePill}>
              <Text style={styles.vibePillText}>{vibeLabels[v] ?? v}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action area */}
      {isMyPlan ? (
        // ── Creator view: only they see pending requests + "can't make it" count ──
        <View style={styles.creatorActions}>
          <TouchableOpacity
            style={[styles.interestedCountBtn, pendingCount > 0 && styles.interestedCountBtnActive]}
            onPress={() => setInterestedModal(true)}
          >
            <Ionicons
              name="heart-outline"
              size={16}
              color={pendingCount > 0 ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.interestedCountText, pendingCount > 0 && styles.interestedCountTextActive]}>
              {pendingCount > 0 ? `${pendingCount} want${pendingCount === 1 ? 's' : ''} in` : 'No requests yet'}
            </Text>
            {pendingCount > 0 && <View style={styles.pendingDot} />}
          </TouchableOpacity>

          {acceptedMatches.length > 0 && (
            <TouchableOpacity style={styles.matchedBtn} onPress={() => setInterestedModal(true)}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.matchedBtnText}>{acceptedMatches.length} in</Text>
            </TouchableOpacity>
          )}

          {/* Only creator sees who can't make it */}
          {userDeclinedCount > 0 && (
            <View style={styles.cantMakeItBadge}>
              <Ionicons name="close-circle-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.cantMakeItText}>{userDeclinedCount} can't make it</Text>
            </View>
          )}
        </View>
      ) : plan.planType === 'exclusive_date' ? (
        // ── Interest flow (date plan) ──
        myAcceptedMatch ? (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => setChatTarget({ userId: plan.creatorId, name: plan.creatorName })}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.textInverse} />
            <Text style={styles.chatBtnText}>Chat with {plan.creatorName.split(' ')[0]}</Text>
          </TouchableOpacity>
        ) : plan.hasExpressedInterest ? (
          <TouchableOpacity style={styles.interestSentBtn} onPress={handleInterest}>
            <Ionicons name="heart" size={16} color={colors.primary} />
            <Text style={styles.interestSentText}>Request sent · tap to undo</Text>
          </TouchableOpacity>
        ) : hasUserDeclined ? (
          // Already said "not available" — let them change their mind
          <View style={styles.declinedRow}>
            <Text style={styles.declinedText}>You said you're not available</Text>
            <TouchableOpacity onPress={handleInterest} style={styles.undeclineBtn}>
              <Text style={styles.undeclineText}>I'm In instead</Text>
            </TouchableOpacity>
          </View>
        ) : isFull ? (
          <View style={styles.fullBtn}><Text style={styles.fullBtnText}>Full</Text></View>
        ) : (
          <View style={styles.yesNoRow}>
            <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.imInGrad}>
              <TouchableOpacity style={styles.actionGradInner} onPress={handleInterest} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                <Text style={styles.actionGradText}>I'm In</Text>
              </TouchableOpacity>
            </LinearGradient>
            <TouchableOpacity
              style={styles.notAvailBtn}
              onPress={() => userDeclinePlan(plan.id, currentUserId, currentName, currentInstagram)}
              activeOpacity={0.7}
            >
              <Text style={styles.notAvailText}>Not Available</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        // ── Join flow (group/open) ──
        plan.isJoined ? (
          <TouchableOpacity style={styles.joinedBtn} onPress={handleJoin}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.joinedBtnText}>You're in · tap to leave</Text>
          </TouchableOpacity>
        ) : hasUserDeclined ? (
          <View style={styles.declinedRow}>
            <Text style={styles.declinedText}>You said you're not available</Text>
            <TouchableOpacity onPress={handleJoin} style={styles.undeclineBtn}>
              <Text style={styles.undeclineText}>Join anyway</Text>
            </TouchableOpacity>
          </View>
        ) : isFull ? (
          <View style={styles.fullBtn}><Text style={styles.fullBtnText}>Full</Text></View>
        ) : (
          <View style={styles.yesNoRow}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.imInGrad}>
              <TouchableOpacity style={styles.actionGradInner} onPress={handleJoin} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                <Text style={styles.actionGradText}>I'm In</Text>
              </TouchableOpacity>
            </LinearGradient>
            <TouchableOpacity
              style={styles.notAvailBtn}
              onPress={() => userDeclinePlan(plan.id, currentUserId, currentName, currentInstagram)}
              activeOpacity={0.7}
            >
              <Text style={styles.notAvailText}>Not Available</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Modals */}
      {isMyPlan && (
        <InterestedModal
          visible={interestedModal}
          onClose={() => setInterestedModal(false)}
          plan={plan}
          currentUserId={currentUserId}
          currentName={currentName}
        />
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

// ─── Screen ───────────────────────────────────────────────────────────────────

type PlanTypeFilter = 'all' | 'exclusive_date' | 'group_hangout' | 'open';
type ActivityFilter = 'all' | ActivityType;

export default function PublicPlansScreen() {
  const { plans, fetchPlans } = usePublicPlansStore();
  const { user } = useAuthStore();
  const { friends } = useFriendsStore();
  const { lat, lon } = useLocation();
  const { weather } = useWeather(lat ?? undefined, lon ?? undefined);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [planTypeFilter, setPlanTypeFilter] = useState<PlanTypeFilter>('all');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [showPostModal, setShowPostModal] = useState(false);

  const currentUserId = user?.id ?? '';
  const currentName = user?.name ?? 'You';
  const currentInstagram = user?.instagram;
  const currentPhoto = user?.photo;

  useEffect(() => {
    if (currentUserId) fetchPlans(currentUserId);
  }, [currentUserId]);

  // Users who have plans today (creator + accepted attendees) = "busy"
  const today = new Date().toISOString().slice(0, 10);
  const busyUserIds = new Set<string>();
  plans.filter(p => p.date === today).forEach(p => {
    busyUserIds.add(p.creatorId);
    p.interestedUsers.filter(u => u.status === 'accepted').forEach(u => busyUserIds.add(u.userId));
  });

  // Explore tab only shows group + open plans; date plans live in Dating tab
  const filtered = plans.filter(p => {
    if (p.planType === 'exclusive_date') return false;
    if (planTypeFilter !== 'all' && p.planType !== planTypeFilter) return false;
    if (activityFilter !== 'all' && p.activityType !== activityFilter) return false;
    return true;
  });

  const heroBg = getWeatherBg(
    weather?.current.description ?? '',
    weather?.current.isGoodWeather ?? true,
    new Date().getHours(),
  );

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground />
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Explore Plans</Text>
            <Text style={styles.subtitle}>Find your people in NYC</Text>
          </View>
          <TouchableOpacity style={styles.postBtnWrapper} onPress={() => setShowPostModal(true)} activeOpacity={0.85}>
            <LinearGradient colors={colors.gradients.primary} style={styles.postBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="add" size={20} color={colors.textInverse} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Friends section */}
        {friends.length > 0 && (
          <FriendsSection
            friends={friends}
            onPress={friend =>
              navigation.navigate('UserProfile', {
                userId: friend.id,
                name: friend.name,
                photo: friend.photo,
                instagram: friend.instagram,
              })
            }
          />
        )}

        {/* Plan type filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {([
            { val: 'all', label: 'All plans', icon: 'apps-outline' },
            { val: 'group_hangout', label: 'Groups', icon: 'people-outline' },
            { val: 'open', label: 'Open', icon: 'globe-outline' },
          ] as { val: PlanTypeFilter; label: string; icon: string }[]).map(f => {
            const active = planTypeFilter === f.val;
            const cfg = f.val !== 'all' ? planTypeConfig[f.val] : null;
            return (
              <TouchableOpacity
                key={f.val}
                style={[styles.filterTab, active && (cfg ? { backgroundColor: cfg.gradient[0] } : styles.filterTabActive)]}
                onPress={() => setPlanTypeFilter(f.val)}
                activeOpacity={0.75}
              >
                <Ionicons name={f.icon as any} size={14} color={active ? colors.textInverse : colors.textSecondary} />
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Activity filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actFilterScroll}
          contentContainerStyle={styles.actFilterContent}
        >
          {([
            { val: 'all', label: 'All' },
            { val: 'drinks', label: 'Drinks' },
            { val: 'dinner', label: 'Food' },
            { val: 'coffee', label: 'Coffee' },
            { val: 'activity', label: 'Activity' },
            { val: 'watch_sports', label: 'Sports' },
          ] as { val: ActivityFilter; label: string }[]).map(f => {
            const active = activityFilter === f.val;
            return (
              <TouchableOpacity
                key={f.val}
                style={[styles.actFilterChip, active && styles.actFilterChipActive]}
                onPress={() => setActivityFilter(f.val)}
              >
                <Text style={[styles.actFilterText, active && styles.actFilterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Who's Free Today */}
        <WhosFreeStrip
          plans={plans}
          currentUserId={currentUserId}
          onPress={(userId, name, photo, instagram) =>
            navigation.navigate('UserProfile', { userId, name, photo, instagram })
          }
        />

        {/* Feed */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No plans match this filter</Text>
            <Text style={styles.emptySubtext}>Try a different category or post one yourself.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setShowPostModal(true)}>
              <Text style={styles.emptyActionText}>Post a plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentUserId={currentUserId}
              currentName={currentName}
              currentInstagram={currentInstagram}
              onCreatorPress={plan.creatorId !== currentUserId ? () =>
                navigation.navigate('UserProfile', {
                  userId: plan.creatorId,
                  name: plan.creatorName,
                  photo: plan.creatorPhoto,
                  instagram: plan.creatorInstagram,
                }) : undefined
              }
              creatorIsBusy={busyUserIds.has(plan.creatorId)}
            />
          ))
        )}
      </ScrollView>

      <PostPlanModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        currentUserId={currentUserId}
        currentName={currentName}
        currentInstagram={currentInstagram}
        currentPhoto={currentPhoto}
      />
    </SafeAreaView>
  </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm,
  },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy, color: '#fff', letterSpacing: -0.4 },
  subtitle: { fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  postBtnWrapper: { borderRadius: radii.full, overflow: 'hidden', ...shadows.md },
  postBtnGrad: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full },

  filterScroll: { marginBottom: spacing.xs },
  filterContent: { paddingHorizontal: spacing.base, gap: spacing.xs },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radii.full, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: 'rgba(255,255,255,0.8)' },
  filterTabTextActive: { color: colors.textInverse, fontWeight: typography.weights.bold },

  actFilterScroll: { marginBottom: spacing.base },
  actFilterContent: { paddingHorizontal: spacing.base, gap: spacing.xs },
  actFilterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  actFilterChipActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  actFilterText: { fontSize: 12, color: colors.textSecondary, fontWeight: typography.weights.medium },
  actFilterTextActive: { color: colors.primary, fontWeight: typography.weights.bold },

  // Card
  card: {
    marginHorizontal: spacing.base, marginBottom: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radii.xl,
    padding: spacing.base, borderWidth: 1, borderColor: colors.borderLight, ...shadows.md,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: radii.full, marginBottom: spacing.md,
  },
  typeBadgeText: { fontSize: 10, fontWeight: typography.weights.bold, color: 'rgba(255,255,255,0.95)', letterSpacing: 0.3 },

  posterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: typography.weights.heavy, color: colors.textInverse, letterSpacing: -0.3 },
  posterInfo: { flex: 1 },
  posterName: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text },
  igRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  igHandle: { fontSize: typography.sizes.xs, color: colors.textTertiary },
  timeAgo: { fontSize: typography.sizes.xs, color: colors.textTertiary },

  activityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: radii.full, marginBottom: spacing.sm,
  },
  activityPillText: { fontSize: 11, fontWeight: typography.weights.bold, color: 'rgba(255,255,255,0.95)', letterSpacing: 0.2 },

  planName: { fontSize: typography.sizes.md, fontWeight: typography.weights.heavy, color: colors.text, letterSpacing: -0.3, marginBottom: spacing.xs },
  description: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md },

  detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  detailSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  vibesRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  vibePill: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radii.full, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  vibePillText: { fontSize: 11, color: colors.textSecondary, fontWeight: typography.weights.medium },

  // Creator actions
  creatorActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  interestedCountBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radii.lg, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  interestedCountBtnActive: { borderColor: colors.primary + '40', backgroundColor: colors.primary + '0C' },
  interestedCountText: { fontSize: typography.sizes.sm, color: colors.textTertiary, fontWeight: typography.weights.medium },
  interestedCountTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginLeft: 'auto' },
  matchedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radii.lg, backgroundColor: colors.success + '12',
    borderWidth: 1, borderColor: colors.success + '30',
  },
  matchedBtnText: { fontSize: typography.sizes.sm, color: colors.success, fontWeight: typography.weights.bold },

  // Action buttons
  actionGrad: { borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.xs },
  actionGradInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.base,
  },
  actionGradText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textInverse },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2, borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  chatBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textInverse },

  interestSentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2, borderRadius: radii.lg,
    backgroundColor: colors.primary + '12',
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  interestSentText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.medium },

  joinedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2, borderRadius: radii.lg,
    backgroundColor: colors.success + '14',
    borderWidth: 1, borderColor: colors.success + '40',
  },
  joinedBtnText: { fontSize: typography.sizes.sm, color: colors.success, fontWeight: typography.weights.medium },

  fullBtn: {
    alignItems: 'center', marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2, borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  fullBtnText: { fontSize: typography.sizes.sm, color: colors.textTertiary },

  // Yes / No buttons
  yesNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  imInGrad: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  notAvailBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  notAvailText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  // Already declined state
  declinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  declinedText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
    flex: 1,
  },
  undeclineBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  undeclineText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // Creator: can't make it count badge
  cantMakeItBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  cantMakeItText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },

  // Empty
  empty: { paddingTop: spacing['4xl'], alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing['2xl'] },
  emptyText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textSecondary, textAlign: 'center' },
  emptySubtext: { fontSize: typography.sizes.sm, color: colors.textTertiary, textAlign: 'center' },
  emptyAction: {
    marginTop: spacing.sm, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.full,
  },
  emptyActionText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textInverse },

  // Availability dot on avatar
  availDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.background,
  },
  availDotFree: { backgroundColor: '#22C55E' },
  availDotBusy: { backgroundColor: colors.textTertiary },

  // Who's Free strip
  freeStripWrap: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.xl,
    backgroundColor: '#22C55E08',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#22C55E30',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  freeStripLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#22C55E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  freeStripScroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.base,
  },
  freeChip: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 52,
  },
  freeChipName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

// ─── Friends section styles ───────────────────────────────────────────────────

const fStyles = StyleSheet.create({
  sectionWrap: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionCount: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    backgroundColor: colors.primary + '14',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },

  // Individual friend card
  card: {
    width: 96,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    ...shadows.sm,
  },
  name: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },

  // 7-day mini calendar
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  dayLetter: {
    fontSize: 7,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  dayLetterToday: {
    color: colors.primary,
    fontWeight: typography.weights.heavy,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFree: { backgroundColor: '#22C55E' },
  dotBusy: { backgroundColor: colors.primary },
  dotUnknown: { backgroundColor: colors.borderLight },
});

// ─── Chat styles ──────────────────────────────────────────────────────────────

const chatStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceSecondary },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerName: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text },
  messageList: { flex: 1 },
  messageContent: { padding: spacing.base, gap: spacing.sm },
  emptyChat: { textAlign: 'center', fontSize: typography.sizes.sm, color: colors.textTertiary, marginTop: spacing['3xl'], fontStyle: 'italic' },
  bubble: {
    maxWidth: '75%', padding: spacing.md, borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleThem: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: typography.sizes.base, color: colors.text, lineHeight: 20 },
  bubbleTextMe: { color: colors.textInverse },
  bubbleTime: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radii.full,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    fontSize: typography.sizes.base, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceSecondary },
});

// ─── Interested modal styles ──────────────────────────────────────────────────

const intStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceSecondary },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text },
  content: { padding: spacing.base, gap: spacing.base },
  group: { gap: spacing.sm },
  groupLabel: {
    fontSize: typography.sizes.xs, fontWeight: typography.weights.bold,
    color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.text },
  rowIg: { fontSize: typography.sizes.xs, color: colors.primary, marginTop: 2 },
  rowTime: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: spacing.xs },
  acceptBtn: {
    width: 34, height: 34, borderRadius: radii.full,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    width: 34, height: 34, borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  matchText: { fontSize: typography.sizes.xs, color: colors.success, fontWeight: typography.weights.semibold },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '10',
  },
  chatBtnText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.bold },
  empty: { paddingTop: spacing['2xl'], alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.textSecondary, textAlign: 'center' },
  emptySubtext: { fontSize: typography.sizes.sm, color: colors.textTertiary, textAlign: 'center' },
});

// ─── Post plan modal styles ───────────────────────────────────────────────────

const postStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceSecondary },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text },
  postBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radii.full, backgroundColor: colors.primary,
  },
  postBtnDisabled: { backgroundColor: colors.border },
  postBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.textInverse },
  postBtnTextDisabled: { color: colors.textTertiary },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: spacing['4xl'] },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: -spacing.xs },
  sublabel: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginBottom: -spacing.xs },
  optional: { fontWeight: typography.weights.regular, color: colors.textTertiary },
  input: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    fontSize: typography.sizes.base, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  inputMulti: { minHeight: 88, paddingTop: spacing.md },
  // Plan type
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.md, borderRadius: radii.xl,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    gap: spacing.xs, overflow: 'hidden', minHeight: 72,
  },
  typeLabel: { fontSize: 11, fontWeight: typography.weights.bold, color: colors.text, textAlign: 'center' },
  // Activity
  activityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  activityChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  activityChipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  // Sub chips
  subRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  subChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radii.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  subChipActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  subChipText: { fontSize: typography.sizes.sm, color: colors.textSecondary, fontWeight: typography.weights.medium },
  subChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  // Time
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  timeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  timeChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  timeChipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  timeChipTextActive: { color: colors.textInverse },
  timeChipSub: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  timeChipSubActive: { color: 'rgba(255,255,255,0.65)' },
  // Visibility
  visRow: { flexDirection: 'row', gap: spacing.sm },
  visChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
    borderRadius: radii.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  visChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  visChipText: { fontSize: typography.sizes.sm, color: colors.textTertiary, fontWeight: typography.weights.medium },
  visChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
});
