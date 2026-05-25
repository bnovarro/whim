import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/types';
import { useWhimStore } from '../store/whimStore';
import { useAuthStore } from '../store/authStore';
import { colors, typography, spacing, radii, shadows, activityColors, activityIcons, vibeLabels } from '../theme';
import { formatWhimTime } from '../utils/dateUtils';
import { formatGroupSize } from '../utils/formatters';
import AgentSearching from '../components/AgentSearching';
import VenueCard from '../components/VenueCard';
import SportsEventCard from '../components/SportsEventCard';
import Chip from '../components/common/Chip';
import Button from '../components/common/Button';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WhimDetail'>;
  route: RouteProp<RootStackParamList, 'WhimDetail'>;
};

export default function WhimDetailScreen({ navigation, route }: Props) {
  const { whimId } = route.params;
  const { getWhimById, inviteFriend, cancelWhim, isSearching, searchingMessage } = useWhimStore();
  const { user, friends } = useAuthStore();

  const whim = getWhimById(whimId);

  useEffect(() => {
    if (!whim) navigation.goBack();
  }, [whim]);

  if (!whim) return null;

  const gradient = activityColors[whim.params.activityType] || colors.gradients.primary;
  const emoji = activityIcons[whim.params.activityType];
  const confirmedAttendees = whim.attendees.filter(a => a.status === 'confirmed');
  const mainVenues = whim.venues.filter(v => !v.isAlternative);
  const altVenues = whim.venues.filter(v => v.isAlternative);

  const handleShare = async (specific = false) => {
    try {
      const selectedVenue = specific && whim.selectedVenueId
        ? whim.venues.find(v => v.id === whim.selectedVenueId)
        : null;

      const message = selectedVenue
        ? `Hey! We're going to ${selectedVenue.name} for ${whim.params.activityType} tonight (${whim.params.timeStart}). You in? ${whim.shareLink}`
        : `Hey! I'm planning ${whim.params.activityType} tonight (${whim.params.timeStart}–${whim.params.timeEnd}). You in? ${whim.shareLink}`;

      await Share.share({ message, url: whim.shareLink });
    } catch { /* ignore */ }
  };

  const handleInviteFriend = (friendId: string, friendName: string) => {
    inviteFriend(whimId, friendId, friendName);
    Alert.alert('Invited!', `${friendName} has been invited to join your whim.`);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel this plan?',
      'This will remove it from your active plans. You can always start a new one.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel plan', style: 'destructive', onPress: () => { cancelWhim(whimId); navigation.goBack(); } },
      ]
    );
  };

  const uninvitedFriends = friends.filter(f => !whim.attendees.some(a => a.userId === f.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleShare()} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Whim identity */}
        <View style={styles.identitySection}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emojiBlock}>
            <Ionicons name={emoji as any} size={26} color={colors.textInverse} />
          </LinearGradient>
          <View style={styles.identityText}>
            {whim.params.planName ? (
              <Text style={styles.planTitle}>{whim.params.planName}</Text>
            ) : null}
            <Text style={[styles.activityTitle, whim.params.planName ? styles.activityTitleSmall : null]}>
              {whim.params.activityType === 'watch_sports' ? 'Watch Sports' :
               whim.params.activityType === 'sports' ? 'Live Events' :
               whim.params.activityType.charAt(0).toUpperCase() + whim.params.activityType.slice(1)}
            </Text>
            <Text style={styles.timeRange}>{formatWhimTime(whim.params.timeStart, whim.params.timeEnd)}</Text>
            <Text style={styles.metaLine}>
              {whim.params.radiusMiles} mi radius · {formatGroupSize(whim.params.groupSize)}
            </Text>
          </View>
        </View>

        {/* Vibes */}
        {whim.params.vibes.length > 0 && (
          <View style={styles.vibesRow}>
            {whim.params.vibes.map(v => (
              <Chip key={v} label={vibeLabels[v]} selected />
            ))}
          </View>
        )}

        {/* Notes */}
        {whim.params.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesText}>"{whim.params.notes}"</Text>
          </View>
        )}

        {/* Attendees */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Who's in</Text>
            <View style={styles.inviteOptions}>
              <TouchableOpacity onPress={() => handleShare(false)} style={styles.inviteBtn}>
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={styles.inviteBtnText}>
                  {whim.selectedVenueId ? 'Invite broadly' : 'Invite via link'}
                </Text>
              </TouchableOpacity>
              {whim.selectedVenueId && (
                <TouchableOpacity onPress={() => handleShare(true)} style={[styles.inviteBtn, styles.inviteBtnSpecific]}>
                  <Ionicons name="location-outline" size={16} color={colors.textInverse} />
                  <Text style={[styles.inviteBtnText, { color: colors.textInverse }]}>Invite to spot</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.attendeeList}>
            {whim.attendees.map(a => (
              <View key={a.userId} style={styles.attendee}>
                <View style={[styles.avatar, { backgroundColor: stringToColor(a.name) }]}>
                  <Text style={styles.avatarText}>{a.name[0]}</Text>
                </View>
                <Text style={styles.attendeeName}>{a.name}</Text>
                <View style={[styles.attendeeStatus, { backgroundColor: statusBg(a.status) }]}>
                  <Text style={[styles.attendeeStatusText, { color: statusColor(a.status) }]}>
                    {a.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {uninvitedFriends.length > 0 && (
            <View style={styles.friendSuggestions}>
              <Text style={styles.friendSuggestLabel}>Invite friends</Text>
              {uninvitedFriends.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.friendRow}
                  onPress={() => handleInviteFriend(f.id, f.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, styles.avatarSm, { backgroundColor: stringToColor(f.name) }]}>
                    <Text style={styles.avatarTextSm}>{f.name[0]}</Text>
                  </View>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Venues section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {whim.status === 'searching' ? 'Finding spots...' :
              whim.status === 'found' ? `${mainVenues.length} spots found` :
                whim.status === 'confirmed' ? 'You\'re locked in' :
                  'Spots'}
          </Text>

          {(whim.status === 'searching' || isSearching) ? (
            <AgentSearching message={searchingMessage || 'Scanning the city...'} />
          ) : (
            <>
              {mainVenues.map((v, i) => (
                <VenueCard key={v.id} venue={v} rank={i + 1} />
              ))}

              {altVenues.length > 0 && (
                <>
                  <View style={styles.altDivider}>
                    <View style={styles.altDividerLine} />
                    <Text style={styles.altDividerText}>Outside your criteria — but worth it</Text>
                    <View style={styles.altDividerLine} />
                  </View>
                  {altVenues.map((v, i) => (
                    <VenueCard key={v.id} venue={v} rank={mainVenues.length + i + 1} />
                  ))}
                </>
              )}

              {whim.venues.length === 0 && !isSearching && (
                <View style={styles.noVenues}>
                  <Text style={styles.noVenuesText}>No spots found yet. Try broadening your criteria.</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Sports events section */}
        {whim.params.activityType === 'sports' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isSearching ? 'Finding events...' : `Live events nearby`}
            </Text>
            {isSearching ? (
              <AgentSearching message="Checking schedules..." />
            ) : (
              whim.sportsEvents?.map(event => (
                <SportsEventCard key={event.id} event={event} />
              ))
            )}
          </View>
        )}

        {whim.status !== 'cancelled' && whim.status !== 'completed' && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.cancelBtnText}>Cancel this plan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function stringToColor(str: string): string {
  const colors = ['#FF6B35', '#E55A25', '#C07A3D', '#FF3D6B', '#FF8C42', '#F59E0B', '#FF9A6B'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function statusBg(status: string): string {
  if (status === 'confirmed') return colors.success + '18';
  if (status === 'declined') return colors.danger + '18';
  return colors.warning + '18';
}

function statusColor(status: string): string {
  if (status === 'confirmed') return colors.success;
  if (status === 'declined') return colors.danger;
  return colors.warning;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceSecondary, borderRadius: radii.full,
  },
  shareBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['4xl'] },
  identitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  emojiBlock: {
    width: 64, height: 64,
    borderRadius: radii.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  activityEmoji: { fontSize: 28 },
  identityText: { flex: 1, gap: spacing.xs },
  planTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.3,
  },
  activityTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  activityTitleSmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  timeRange: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  metaLine: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  vibesRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  notesBlock: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: typography.sizes.base * 1.5,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  inviteBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  attendeeList: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  attendee: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  avatar: {
    width: 36, height: 36, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSm: { width: 32, height: 32 },
  avatarText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  avatarTextSm: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  attendeeName: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  attendeeStatus: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radii.full,
  },
  attendeeStatusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },
  friendSuggestions: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  friendSuggestLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  friendName: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  altDivider: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.base,
    marginVertical: spacing.base,
    gap: spacing.sm,
  },
  altDividerLine: {
    flex: 1, height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  altDividerText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  noVenues: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noVenuesText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inviteOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteBtnSpecific: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.danger + '40',
    backgroundColor: colors.danger + '08',
  },
  cancelBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
});
