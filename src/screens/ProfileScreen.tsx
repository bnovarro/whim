import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch, Linking, Image, TextInput, Modal,
  Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../store/authStore';
import { useWhimStore } from '../store/whimStore';
import { useCalendarStore } from '../store/calendarStore';
import { usePublicPlansStore } from '../store/publicPlansStore';
import { useFriendsStore } from '../store/friendsStore';
import { useWeather } from '../hooks/useWeather';
import { useLocation } from '../hooks/useLocation';
import { colors, typography, spacing, radii, shadows, getWeatherBg } from '../theme';
import GradientBackground from '../components/GradientBackground';
import { activityIcons, planTypeConfig } from '../theme';

const { width } = Dimensions.get('window');
const PHOTO_GAP = spacing.xs;

// Sunset-inspired gradient pool — orange → pink/rose
const SUNSET_GRADS: Array<[string, string]> = [
  ['#FF6B35', '#FF3D6B'],
  ['#FF8C42', '#FF6B9D'],
  ['#F97316', '#EC4899'],
  ['#FF9A56', '#FF5E8A'],
  ['#E55A25', '#FF3D6B'],
  ['#FFAA6B', '#FF6B9D'],
  ['#FF6B6B', '#C026D3'],
];
function sunsetGrad(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return SUNSET_GRADS[Math.abs(h) % SUNSET_GRADS.length];
}
const PHOTO_COLS = 3;
const PHOTO_SIZE = (width - spacing.base * 2 - PHOTO_GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;
const MAX_PHOTOS = 6;

export default function ProfileScreen() {
  const navigation = useNavigation();
  const {
    user, friends, logout,
    updateInstagram, updateBeli, updateSpotify, updateBio, updatePhotos,
    updateProfilePhoto, updateAvailabilityVisibility, updatePrompts,
  } = useAuthStore();
  const { whims } = useWhimStore();
  const { isLinked: calLinked, todayEvents, unlinkCalendar } = useCalendarStore();
  const { plans } = usePublicPlansStore();
  const { friends: friendList } = useFriendsStore();
  const { lat, lon } = useLocation();
  const { weather } = useWeather(lat ?? undefined, lon ?? undefined);

  const heroBg = getWeatherBg(
    weather?.current.description ?? '',
    weather?.current.isGoodWeather ?? true,
    new Date().getHours(),
  );

  // Whims = same-day spontaneous plans (created for today's date)
  const today = new Date().toISOString().slice(0, 10);
  const completedWhims = whims.filter(w => w.status === 'completed' || w.status === 'confirmed').length;
  const todayWhims = whims.filter(w =>
    (w.params?.whimDate ?? w.createdAt?.slice(0, 10)) === today &&
    w.status !== 'cancelled',
  ).length;
  // Plans = public plans posted by the user
  const myPostedPlans = plans.filter(p => p.creatorId === user?.id).length;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [weatherAlertsEnabled, setWeatherAlertsEnabled] = useState(true);
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [bioDraft, setBioDraft] = useState(user?.bio ?? '');
  const [profileTab, setProfileTab] = useState<'plans' | 'friends'>('plans');

  // Unified inline-edit modal for social handles + prompts
  type EditField = 'instagram' | 'beli' | 'spotify' | { prompt: string };
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');

  const openEdit = (field: EditField, current: string) => {
    setEditField(field);
    setEditValue(current);
  };
  const closeEdit = () => { setEditField(null); setEditValue(''); };

  const saveEdit = async () => {
    if (!editField) return;
    if (typeof editField === 'string') {
      const clean = editValue.replace(/^@/, '').trim();
      if (editField === 'instagram') await updateInstagram(clean);
      if (editField === 'beli')      await updateBeli(clean);
      if (editField === 'spotify')   await updateSpotify(clean);
    } else {
      // prompt answer
      const merged = { ...(user?.prompts ?? {}), [editField.prompt]: editValue.trim() };
      await updatePrompts(merged);
    }
    closeEdit();
  };

  const PROMPTS = [
    'Favorite restaurant?',
    'Go-to drink order?',
    'Best spontaneous memory?',
    'Always down for...',
  ];

  if (!user) return null;

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const photos: (string | null)[] = [
    ...(user.photos ?? []),
    ...Array(MAX_PHOTOS - (user.photos?.length ?? 0)).fill(null),
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleInstagram = () => openEdit('instagram', user.instagram ?? '');
  const handleBeli      = () => openEdit('beli',      user.beli      ?? '');
  const handleSpotify   = () => openEdit('spotify',   user.spotify   ?? '');

  const handleSaveBio = () => {
    updateBio(bioDraft);
    setBioModalVisible(false);
  };

  const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access in Settings to add photos.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  };

  const handleAvatarPress = () => {
    if (user.photo) {
      Alert.alert('Profile photo', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change photo', onPress: async () => { const uri = await pickImage(); if (uri) updateProfilePhoto(uri); } },
        { text: 'Remove photo', style: 'destructive', onPress: () => updateProfilePhoto(null) },
      ]);
    } else {
      pickImage().then(uri => { if (uri) updateProfilePhoto(uri); });
    }
  };

  const handlePhotoSlot = (index: number) => {
    const current = photos[index];
    if (current) {
      Alert.alert('Photo', '', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = (user.photos ?? []).filter((_, i) => i !== index);
            updatePhotos(updated);
          },
        },
      ]);
    } else {
      pickImage().then(uri => {
        if (uri) {
          const updated = [...(user.photos ?? []), uri].slice(0, MAX_PHOTOS);
          updatePhotos(updated);
        }
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground />
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + Name ── */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} style={styles.avatarWrapper}>
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarPhoto} />
            ) : (
              <LinearGradient
                colors={sunsetGrad(user.name)}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={12} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileUsername}>@{user.username}</Text>
            <View style={styles.profileCity}>
              <Ionicons name="location" size={12} color={colors.primary} />
              <Text style={styles.profileCityText}>{user.city}</Text>
            </View>
          </View>
        </View>

        {/* ── Bio ── */}
        <TouchableOpacity
          style={styles.bioCard}
          onPress={() => { setBioDraft(user.bio ?? ''); setBioModalVisible(true); }}
          activeOpacity={0.75}
        >
          {user.bio ? (
            <Text style={styles.bioText}>{user.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>Add a bio — tell people your vibe</Text>
          )}
          <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} style={{ marginTop: 2 }} />
        </TouchableOpacity>

        {/* ── Social links ── */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={[styles.socialChip, user.instagram && styles.socialChipLinked]} onPress={handleInstagram} activeOpacity={0.75}>
            <Ionicons name="logo-instagram" size={15} color={user.instagram ? colors.primary : colors.textTertiary} />
            <Text style={[styles.socialChipText, user.instagram && styles.socialChipTextLinked]}>
              {user.instagram ? `@${user.instagram}` : 'Instagram'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialChip, user.beli && styles.socialChipLinked]} onPress={handleBeli} activeOpacity={0.75}>
            <Ionicons name="restaurant-outline" size={15} color={user.beli ? colors.primary : colors.textTertiary} />
            <Text style={[styles.socialChipText, user.beli && styles.socialChipTextLinked]}>
              {user.beli ? `@${user.beli}` : 'Beli'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialChip, user.spotify && styles.socialChipLinked]} onPress={handleSpotify} activeOpacity={0.75}>
            <Ionicons name="musical-notes-outline" size={15} color={user.spotify ? colors.primary : colors.textTertiary} />
            <Text style={[styles.socialChipText, user.spotify && styles.socialChipTextLinked]}>
              {user.spotify ? `@${user.spotify}` : 'Spotify'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.stats}>
          {[
            { label: 'Whims today', value: todayWhims,     tip: 'Same-day spontaneous plans' },
            { label: 'Plans',       value: myPostedPlans,  tip: 'Public plans you\'ve posted' },
            { label: 'Friends',     value: friends.length, tip: undefined },
          ].map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Photo Gallery ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.sectionMeta}>{user.photos?.length ?? 0} / {MAX_PHOTOS}</Text>
          </View>
          <View style={styles.photoGrid}>
            {photos.map((photo, i) => (
              <TouchableOpacity
                key={i}
                style={styles.photoSlot}
                onPress={() => handlePhotoSlot(i)}
                activeOpacity={0.8}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoEmpty}>
                    <Ionicons name="add" size={22} color={colors.textTertiary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.photoHint}>Add up to 6 photos to your profile.</Text>
        </View>

        {/* ── Prompts ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prompts</Text>
          {PROMPTS.map(prompt => {
            const answer = user.prompts?.[prompt] ?? '';
            return (
              <TouchableOpacity
                key={prompt}
                style={styles.promptCard}
                onPress={() => openEdit({ prompt }, answer)}
                activeOpacity={0.75}
              >
                <Text style={styles.promptQ}>{prompt}</Text>
                {answer ? (
                  <Text style={styles.promptA}>{answer}</Text>
                ) : (
                  <Text style={styles.promptEmpty}>Tap to answer...</Text>
                )}
                <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} style={styles.promptEdit} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Friends ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>Add friends</Text>
            </TouchableOpacity>
          </View>
          {friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends yet. Invite someone to Whim!</Text>
          ) : (
            friends.map(f => (
              <View key={f.id} style={styles.friendRow}>
                <View style={[styles.friendAvatar, { backgroundColor: stringToColor(f.name) }]}>
                  <Text style={styles.friendAvatarText}>{f.name[0]}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={styles.friendUsername}>@{f.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            ))
          )}
        </View>

        {/* ── Connected Services ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Services</Text>

          <View style={styles.calCard}>
            <View style={styles.calLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#4285F414' }]}>
                <Ionicons name="calendar-outline" size={17} color="#4285F4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Google Calendar</Text>
                {calLinked ? (
                  <Text style={styles.calStatus}>
                    ✓ Linked · {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''} today
                  </Text>
                ) : (
                  <Text style={styles.calStatus}>Not connected</Text>
                )}
              </View>
            </View>
            {calLinked ? (
              <TouchableOpacity
                onPress={() => Alert.alert(
                  'Unlink Google Calendar?',
                  'Your availability won\'t factor in Google Calendar events.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Unlink', style: 'destructive', onPress: unlinkCalendar },
                  ],
                )}
                style={styles.calUnlinkBtn}
              >
                <Text style={styles.calUnlinkText}>Unlink</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.calConnectHint}>
                <Text style={styles.calHintText}>Sign in with Google to connect</Text>
              </View>
            )}
          </View>

          {!calLinked && (
            <Text style={styles.calNote}>
              Linking Google Calendar lets Whim show when you're free and adds your plans to your calendar automatically.
            </Text>
          )}
        </View>

        {/* ── Availability ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#22C55E14' }]}>
                <Ionicons name="radio-outline" size={17} color="#22C55E" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Show my availability</Text>
                <Text style={styles.settingDesc}>Let others see if you're free today</Text>
              </View>
            </View>
          </View>
          <View style={styles.availabilityRow}>
            {(['public', 'friends', 'private'] as const).map(opt => {
              const active = (user.availabilityVisibility ?? 'private') === opt;
              const label  = opt === 'public' ? 'Everyone' : opt === 'friends' ? 'Friends' : 'Off';
              const icon   = opt === 'public' ? 'globe-outline' : opt === 'friends' ? 'people-outline' : 'eye-off-outline';
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.availabilityBtn, active && styles.availabilityBtnActive]}
                  onPress={() => updateAvailabilityVisibility(opt)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={icon as any} size={14} color={active ? '#22C55E' : colors.textTertiary} />
                  <Text style={[styles.availabilityBtnText, active && styles.availabilityBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.availabilityHint}>
            {(user.availabilityVisibility ?? 'private') === 'public'
              ? 'Everyone can see when you have no plans for the day.'
              : (user.availabilityVisibility ?? 'private') === 'friends'
              ? 'Only your friends see your availability status.'
              : 'Your availability is hidden from everyone.'}
          </Text>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + '14' }]}>
                <Ionicons name="notifications-outline" size={17} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Push notifications</Text>
                <Text style={styles.settingDesc}>Whim invites, venue updates</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.textInverse}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.warning + '14' }]}>
                <Ionicons name="partly-sunny-outline" size={17} color={colors.warning} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Weather alerts</Text>
                <Text style={styles.settingDesc}>Great day & escape nudges</Text>
              </View>
            </View>
            <Switch
              value={weatherAlertsEnabled}
              onValueChange={setWeatherAlertsEnabled}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.textInverse}
            />
          </View>

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.success + '14' }]}>
                <Ionicons name="location-outline" size={17} color={colors.success} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Home base</Text>
                <Text style={styles.settingDesc}>
                  {user.homeAddress ? `${user.homeAddress}, ${user.city}` : user.city}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
        </View>

        {/* ── Plans + Friends tabs ── */}
        <View style={styles.section}>
          {/* Tab switcher */}
          <View style={styles.profileTabRow}>
            {(['plans', 'friends'] as const).map(tab => {
              const active = profileTab === tab;
              const label = tab === 'plans' ? 'My Plans' : 'Friends';
              const count = tab === 'plans'
                ? plans.filter(p => p.creatorId === user.id).length
                : friendList.length;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.profileTabBtn, active && styles.profileTabBtnActive]}
                  onPress={() => setProfileTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.profileTabText, active && styles.profileTabTextActive]}>
                    {label}
                  </Text>
                  <View style={[styles.profileTabCount, active && styles.profileTabCountActive]}>
                    <Text style={[styles.profileTabCountText, active && styles.profileTabCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Plans tab content */}
          {profileTab === 'plans' && (() => {
            const myPlans = plans.filter(p => p.creatorId === user.id);
            if (myPlans.length === 0) {
              return (
                <View style={styles.profileTabEmpty}>
                  <Ionicons name="calendar-outline" size={28} color={colors.textTertiary} />
                  <Text style={styles.profileTabEmptyText}>No plans posted yet</Text>
                </View>
              );
            }
            return (
              <View style={styles.profilePlanList}>
                {myPlans.map(plan => {
                  const cfg  = planTypeConfig[plan.planType];
                  const icon = activityIcons[plan.activityType] ?? 'flash-outline';
                  const pending = plan.interestedUsers.filter(u => u.status === 'pending').length;
                  return (
                    <View key={plan.id} style={styles.profilePlanCard}>
                      <LinearGradient
                        colors={cfg.gradient}
                        style={styles.profilePlanIcon}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name={icon as any} size={14} color={colors.textInverse} />
                      </LinearGradient>
                      <View style={styles.profilePlanInfo}>
                        <Text style={styles.profilePlanName} numberOfLines={1}>{plan.planName}</Text>
                        <Text style={styles.profilePlanMeta}>{plan.neighborhood} · {plan.timeStart}</Text>
                      </View>
                      {pending > 0 && (
                        <View style={styles.profilePlanBadge}>
                          <Text style={styles.profilePlanBadgeText}>{pending}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Friends tab content */}
          {profileTab === 'friends' && (() => {
            if (friendList.length === 0) {
              return (
                <View style={styles.profileTabEmpty}>
                  <Ionicons name="people-outline" size={28} color={colors.textTertiary} />
                  <Text style={styles.profileTabEmptyText}>No friends yet</Text>
                </View>
              );
            }
            return (
              <View style={styles.profileFriendList}>
                {friendList.map(friend => {
                  const initials = friend.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const isAvailToday = friend.availabilityVisibility !== 'private' && friend.weekAvailability[0] === 'free';
                  const showDot = friend.availabilityVisibility !== 'private';
                  return (
                    <View key={friend.id} style={styles.profileFriendRow}>
                      <View style={styles.profileFriendAvatarWrap}>
                        <LinearGradient
                          colors={sunsetGrad(friend.name)}
                          style={styles.profileFriendAvatar}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.profileFriendInitials}>{initials}</Text>
                        </LinearGradient>
                        {showDot && (
                          <View style={[
                            styles.profileFriendDot,
                            { backgroundColor: isAvailToday ? '#22C55E' : colors.textTertiary },
                          ]} />
                        )}
                      </View>
                      <View style={styles.profileFriendInfo}>
                        <Text style={styles.profileFriendName}>{friend.name}</Text>
                        {friend.instagram && (
                          <Text style={styles.profileFriendIg}>@{friend.instagram}</Text>
                        )}
                      </View>
                      {showDot && (
                        <Text style={[
                          styles.profileFriendAvailText,
                          { color: isAvailToday ? '#22C55E' : colors.textTertiary },
                        ]}>
                          {isAvailToday ? 'Free today' : 'Busy'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Life's too short for boring plans.</Text>
      </ScrollView>

      {/* ── Inline Edit Modal (social handles + prompts) ── */}
      <Modal visible={editField !== null} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeEdit} />
          <View style={styles.bioModal}>
            <View style={styles.bioModalHeader}>
              <Text style={styles.bioModalTitle}>
                {typeof editField === 'string'
                  ? editField.charAt(0).toUpperCase() + editField.slice(1)
                  : (editField as any)?.prompt ?? ''}
              </Text>
              <TouchableOpacity onPress={closeEdit}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.editHandleRow}>
              {typeof editField === 'string' && <Text style={styles.atSign}>@</Text>}
              <TextInput
                style={[styles.bioInput, { minHeight: 48, paddingTop: 12 }]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={typeof editField === 'string' ? 'yourhandle' : 'Your answer...'}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveEdit}
              />
            </View>
            {typeof editField === 'string' && editValue && (
              <TouchableOpacity
                onPress={() => Linking.openURL(
                  editField === 'instagram' ? `https://instagram.com/${editValue}` :
                  editField === 'beli'      ? `https://beliapp.com/${editValue}` :
                  `https://open.spotify.com/user/${editValue}`
                )}
                style={styles.openLinkBtn}
              >
                <Ionicons name="open-outline" size={14} color={colors.primary} />
                <Text style={styles.openLinkText}>Open profile</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.bioSaveBtn} onPress={saveEdit}>
              <Text style={styles.bioSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bio Edit Modal ── */}
      <Modal visible={bioModalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bioModal}>
            <View style={styles.bioModalHeader}>
              <Text style={styles.bioModalTitle}>Your bio</Text>
              <TouchableOpacity onPress={() => setBioModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.bioInput}
              value={bioDraft}
              onChangeText={setBioDraft}
              placeholder="Tell people your vibe — what you're into, what you're looking for…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={200}
              autoFocus
              textAlignVertical="top"
            />
            <Text style={styles.bioCharCount}>{bioDraft.length} / 200</Text>
            <TouchableOpacity
              style={[styles.bioSaveBtn, bioDraft.trim().length === 0 && { opacity: 0.4 }]}
              onPress={handleSaveBio}
              disabled={bioDraft.trim().length === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.bioSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

function stringToColor(str: string): string {
  const palette = ['#FF8C42', '#C07A3D', '#FF6B35', '#E55A25', '#F59E0B', '#FF3D6B'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navBack: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },
  navTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },

  scroll: { flex: 1 },
  content: { paddingBottom: spacing['4xl'] },

  // Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 72, height: 72,
    borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPhoto: {
    width: 72, height: 72,
    borderRadius: radii.full,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarInitials: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  profileUsername: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  profileCity: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 1,
  },
  profileCityText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  // Bio
  bioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bioText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  bioPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Social chips
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialChipLinked: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '0C',
  },
  socialChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontWeight: typography.weights.medium,
  },
  socialChipTextLinked: {
    color: colors.primary,
  },

  // Stats
  stats: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.base,
    gap: 3,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  sectionAction: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  // Photo gallery
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GAP,
    marginBottom: spacing.sm,
  },
  photoSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoEmpty: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
  },
  photoHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  },

  // Friends
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  friendAvatar: {
    width: 38, height: 38,
    borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  friendInfo: { flex: 1 },
  friendName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  friendUsername: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, flex: 1,
  },
  settingIcon: {
    width: 34, height: 34,
    borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  settingDesc: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: 1,
  },

  // Availability
  availabilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  availabilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  availabilityBtnActive: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E12',
  },
  availabilityBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textTertiary,
  },
  availabilityBtnTextActive: {
    color: '#22C55E',
    fontWeight: typography.weights.bold,
  },
  availabilityHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    paddingBottom: spacing.sm,
    fontStyle: 'italic',
  },

  // Google Calendar
  calCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  calLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  calStatus: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  calUnlinkBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger + '60',
    backgroundColor: colors.danger + '08',
  },
  calUnlinkText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: typography.weights.semibold,
  },
  calConnectHint: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  calHintText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  calNote: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    lineHeight: 17,
    paddingBottom: spacing.sm,
    fontStyle: 'italic',
  },

  // About
  aboutRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  aboutValue: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    marginBottom: spacing.xl,
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },

  // Plans + Friends profile tabs
  profileTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.base,
  },
  profileTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  profileTabBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  profileTabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
  },
  profileTabTextActive: {
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  profileTabCount: {
    minWidth: 18, height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  profileTabCountActive: {
    backgroundColor: colors.primary,
  },
  profileTabCountText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
  },
  profileTabCountTextActive: {
    color: colors.textInverse,
  },
  profileTabEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  profileTabEmptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Plans list
  profilePlanList: { gap: spacing.sm },
  profilePlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  profilePlanIcon: {
    width: 36, height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profilePlanInfo: { flex: 1 },
  profilePlanName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  profilePlanMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  profilePlanBadge: {
    minWidth: 22, height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  profilePlanBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  // Friends list
  profileFriendList: { gap: spacing.sm },
  profileFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  profileFriendAvatarWrap: {
    position: 'relative',
    width: 42,
    height: 42,
  },
  profileFriendAvatar: {
    width: 42, height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileFriendInitials: {
    fontSize: 15,
    fontWeight: typography.weights.heavy,
    color: colors.textInverse,
  },
  profileFriendDot: {
    position: 'absolute',
    bottom: -1, right: -1,
    width: 11, height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileFriendInfo: { flex: 1 },
  profileFriendName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  profileFriendIg: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  profileFriendAvailText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  footer: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
    paddingBottom: spacing.xl,
  },

  // Bio Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  bioModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  bioModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  bioModalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  bioInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    maxHeight: 200,
  },
  bioCharCount: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: -spacing.xs,
  },
  bioSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  bioSaveBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },

  // Prompt cards
  promptCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  promptQ: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  promptA: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
  },
  promptEmpty: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  promptEdit: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
  },

  // Inline edit modal extras
  editHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  atSign: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  openLinkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
});
