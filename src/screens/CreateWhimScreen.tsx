import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, addDays, startOfDay, isToday } from 'date-fns';

import { RootStackParamList } from '../navigation/types';
import { ActivityType, FoodCuisine, DrinkVenueType, VibeTag, WhimParams, SportType } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePublicPlansStore } from '../store/publicPlansStore';
import { useWhimStore } from '../store/whimStore';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import {
  colors, typography, spacing, radii, shadows,
  activityIcons, vibeLabels,
  cuisineLabels, drinkTypeLabels, sportTypeLabels, sportTypeIcons,
} from '../theme';
import Button from '../components/common/Button';
import Chip from '../components/common/Chip';
import MapRadiusPicker from '../components/MapRadiusPicker';
import { scheduleWhimReminder } from '../services/notificationService';
import { useNotificationsStore } from '../store/notificationsStore';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 5;

const ACTIVITY_OPTIONS: { type: ActivityType; label: string; desc: string }[] = [
  { type: 'drinks',      label: 'Drinks',      desc: 'Bars, cocktail lounges, wine bars' },
  { type: 'dinner',      label: 'Dinner',      desc: 'Restaurants for a proper sit-down' },
  { type: 'coffee',      label: 'Coffee',      desc: 'Cafes, matcha bars, chill hangs' },
  { type: 'activity',    label: 'Get Active',  desc: 'Pickleball, basketball, golf, bowling…' },
  { type: 'whatever',    label: 'Whatever',    desc: 'Surprise me — cast a wide net' },
  { type: 'sports',      label: 'Live Events', desc: 'Concerts, sports, shows & more' },
  { type: 'watch_sports',label: 'Watch Sports',desc: 'Bars with great TVs and game-day energy' },
];

const SPORT_OPTIONS: { type: SportType; label: string; icon: string }[] = [
  { type: 'pickleball',   label: 'Pickleball',    icon: 'tennisball-outline' },
  { type: 'basketball',   label: 'Basketball',    icon: 'basketball-outline' },
  { type: 'tennis',       label: 'Tennis',        icon: 'tennisball-outline' },
  { type: 'golf',         label: 'Golf / Range',  icon: 'golf-outline' },
  { type: 'bowling',      label: 'Bowling',       icon: 'disc-outline' },
  { type: 'hiking',       label: 'Hiking',        icon: 'walk-outline' },
  { type: 'cycling',      label: 'Cycling',       icon: 'bicycle-outline' },
  { type: 'yoga',         label: 'Yoga',          icon: 'body-outline' },
  { type: 'rock_climbing',label: 'Climbing',      icon: 'layers-outline' },
  { type: 'running',      label: 'Running',       icon: 'footsteps-outline' },
  { type: 'ping_pong',    label: 'Ping Pong',     icon: 'radio-button-on-outline' },
  { type: 'soccer',       label: 'Soccer',        icon: 'football-outline' },
  { type: 'volleyball',   label: 'Volleyball',    icon: 'ellipse-outline' },
];

const TIME_PRESETS = [
  { label: 'After work', time: '6–8pm', start: '6:00 PM', end: '8:00 PM' },
  { label: 'Evening', time: '7–10pm', start: '7:00 PM', end: '10:00 PM' },
  { label: 'Late night', time: '9pm–12am', start: '9:00 PM', end: '12:00 AM' },
  { label: 'Afternoon', time: '2–5pm', start: '2:00 PM', end: '5:00 PM' },
  { label: 'Brunch', time: '11am–2pm', start: '11:00 AM', end: '2:00 PM' },
];

const VIBE_OPTIONS: VibeTag[] = [
  'outdoor', 'rooftop', 'casual', 'upscale', 'hidden_gem',
  'lively', 'intimate', 'trendy', 'classic', 'waterfront',
  'happy_hour', 'live_music', 'trivia_night', 'game_day', 'brunch_spot', 'date_night',
];

const GROUP_SIZES = [1, 2, 3, 4, 5, 6, 8, 10];

const CUISINE_OPTIONS: FoodCuisine[] = [
  'italian', 'japanese', 'korean', 'mexican', 'mediterranean',
  'thai', 'american', 'indian', 'french', 'chinese',
  'pizza', 'sushi', 'brunch', 'steakhouse', 'caribbean',
];

const BAR_TYPE_OPTIONS: DrinkVenueType[] = [
  'cocktail_bar', 'wine_bar', 'rooftop_bar', 'speakeasy',
  'dive_bar', 'beer_garden', 'sports_bar', 'whiskey_bar',
];

const NEIGHBORHOODS = [
  'Lower East Side', 'East Village', 'West Village', 'SoHo', 'NoHo',
  'Tribeca', 'Chelsea', "Hell's Kitchen", 'Midtown', 'Upper East Side',
  'Upper West Side', 'Harlem', 'Williamsburg', 'Bushwick', 'Park Slope',
  'DUMBO', 'Astoria', 'Long Island City', 'Crown Heights', 'Bed-Stuy',
  'Greenpoint', 'Cobble Hill', 'Carroll Gardens', 'Fort Greene', 'Nolita',
];

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, label: 'Public', desc: 'Anyone on Whim can see and join', icon: 'globe-outline' },
  { value: 'friends' as const, label: 'Friends only', desc: 'Only people you follow', icon: 'people-outline' },
  { value: 'specific' as const, label: 'Invite only', desc: 'You manually approve each person', icon: 'lock-closed-outline' },
];

type PlanMode = 'find' | 'explore' | 'date';
type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'CreateWhim'>;

// ─── Natural-language plan parser ─────────────────────────────────────────────

function parsePlanText(text: string): {
  activityType?: ActivityType;
  sportType?: SportType;
  barType?: DrinkVenueType;
  cuisine?: FoodCuisine;
  timePreset?: typeof TIME_PRESETS[number];
  postNeighborhood?: string;
  vibes?: VibeTag[];
  specificSpot?: string;
} {
  const t = text.toLowerCase();
  const out: ReturnType<typeof parsePlanText> = {};

  // Activity + sub-type
  if (/pickleball/.test(t))                            { out.activityType = 'activity'; out.sportType = 'pickleball'; }
  else if (/basketball/.test(t))                       { out.activityType = 'activity'; out.sportType = 'basketball'; }
  else if (/tennis/.test(t))                           { out.activityType = 'activity'; out.sportType = 'tennis'; }
  else if (/golf|driving.?range/.test(t))              { out.activityType = 'activity'; out.sportType = 'golf'; }
  else if (/bowl/.test(t))                             { out.activityType = 'activity'; out.sportType = 'bowling'; }
  else if (/hike|hiking|trail/.test(t))                { out.activityType = 'activity'; out.sportType = 'hiking'; }
  else if (/climb/.test(t))                            { out.activityType = 'activity'; out.sportType = 'rock_climbing'; }
  else if (/yoga/.test(t))                             { out.activityType = 'activity'; out.sportType = 'yoga'; }
  else if (/cycling|bike/.test(t))                     { out.activityType = 'activity'; out.sportType = 'cycling'; }
  else if (/soccer/.test(t))                           { out.activityType = 'activity'; out.sportType = 'soccer'; }
  else if (/ping.?pong/.test(t))                       { out.activityType = 'activity'; out.sportType = 'ping_pong'; }
  else if (/drinks?|cocktail|bar/.test(t) && !/food|eat|dinner/.test(t)) {
    out.activityType = 'drinks';
    if (/rooftop/.test(t))    out.barType = 'rooftop_bar';
    else if (/speakeasy/.test(t)) out.barType = 'speakeasy';
    else if (/wine/.test(t))  out.barType = 'wine_bar';
    else if (/dive/.test(t))  out.barType = 'dive_bar';
    else if (/beer|garden/.test(t)) out.barType = 'beer_garden';
    else if (/whiskey/.test(t)) out.barType = 'whiskey_bar';
  }
  else if (/dinner|restaurant|eat/.test(t)) {
    out.activityType = 'dinner';
    if (/italian/.test(t))          out.cuisine = 'italian';
    else if (/sushi/.test(t))       out.cuisine = 'sushi';
    else if (/japanese/.test(t))    out.cuisine = 'japanese';
    else if (/korean/.test(t))      out.cuisine = 'korean';
    else if (/mexican|taco/.test(t))out.cuisine = 'mexican';
    else if (/french/.test(t))      out.cuisine = 'french';
    else if (/thai/.test(t))        out.cuisine = 'thai';
    else if (/chinese/.test(t))     out.cuisine = 'chinese';
    else if (/indian/.test(t))      out.cuisine = 'indian';
  }
  else if (/coffee|cafe|latte|matcha/.test(t))         { out.activityType = 'coffee'; }
  else if (/concert|show|event/.test(t))               { out.activityType = 'sports'; }
  else if (/watch.*game|game.*day|sports.?bar/.test(t)){ out.activityType = 'watch_sports'; }

  // Time
  if (/after.?work|afterwork|\b[67]\s*pm\b/.test(t))  out.timePreset = TIME_PRESETS[0];
  else if (/evening|\b[89]\s*pm\b/.test(t))            out.timePreset = TIME_PRESETS[1];
  else if (/late|11\s*pm|midnight/.test(t))            out.timePreset = TIME_PRESETS[2];
  else if (/afternoon|2\s*pm|3\s*pm/.test(t))         out.timePreset = TIME_PRESETS[3];
  else if (/brunch|morning|11\s*am/.test(t))           out.timePreset = TIME_PRESETS[4];

  // Neighborhood
  for (const n of NEIGHBORHOODS) {
    if (t.includes(n.toLowerCase())) { out.postNeighborhood = n; break; }
  }

  // Vibes
  const vibeMap: [RegExp, VibeTag][] = [
    [/rooftop/, 'rooftop'], [/outdoor|outside/, 'outdoor'],
    [/casual|chill|low.?key/, 'casual'], [/upscale|fancy/, 'upscale'],
    [/trendy|hip/, 'trendy'], [/intimate|quiet/, 'intimate'],
    [/lively|loud|energy/, 'lively'], [/hidden|secret/, 'hidden_gem'],
    [/live.?music/, 'live_music'], [/happy.?hour/, 'happy_hour'],
  ];
  const vibes: VibeTag[] = [];
  for (const [re, v] of vibeMap) if (re.test(t)) vibes.push(v);
  if (vibes.length) out.vibes = vibes;

  // Specific spot — "at [Venue Name]" pattern
  const atMatch = text.match(/\bat\s+([A-Z][^\,\.]{2,40})(?=\s+in\s+|\s+on\s+|[,\.]|$)/);
  if (atMatch) out.specificSpot = atMatch[1].trim();

  return out;
}

export default function CreateWhimScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const seedActivity = route.params?.activityType ?? null;
  const seedVibes = route.params?.vibes ?? [];
  const seedMode = route.params?.planMode ?? null;
  const { user } = useAuthStore();
  const { createWhim, launchSearch } = useWhimStore();
  const { postPlan } = usePublicPlansStore();
  const { lat, lon } = useLocation();
  const { weather } = useWeather(lat ?? undefined, lon ?? undefined);
  const { push: pushNotif } = useNotificationsStore();

  const today = startOfDay(new Date());
  const twoWeekDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  // step -1 = plan mode selector; step 0+ = actual steps
  const [planMode, setPlanMode] = useState<PlanMode | null>(seedMode);
  const [step, setStep] = useState(seedMode ? 0 : -1);
  const [activityType, setActivityType] = useState<ActivityType | null>(seedActivity);
  const [sportType,    setSportType]    = useState<SportType | null>(null);
  const [cuisine, setCuisine] = useState<FoodCuisine | null>(null);
  const [barType, setBarType] = useState<DrinkVenueType | null>(null);
  const [specificSpot, setSpecificSpot] = useState(''); // venue/spot chosen by user
  const [planName, setPlanName] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postNeighborhood, setPostNeighborhood] = useState('');
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'specific'>('public');
  const [timePreset, setTimePreset] = useState<typeof TIME_PRESETS[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [radiusMiles, setRadiusMiles] = useState(1.5);
  const [vibes, setVibes] = useState<VibeTag[]>(seedVibes);
  const [groupSize, setGroupSize] = useState(2);
  const [notes, setNotes] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [pinLat, setPinLat] = useState(lat ?? 40.7549);
  const [pinLon, setPinLon] = useState(lon ?? -73.984);
  // Chat / natural-language mode
  const [chatMode, setChatMode] = useState(false);
  const [chatText, setChatText] = useState('');
  // Split-the-distance mode (find mode step 2)
  const [splitMode, setSplitMode] = useState<'just_me' | 'split'>('just_me');
  const [myNeighborhood, setMyNeighborhood] = useState('');
  const [splitNeighborhood, setSplitNeighborhood] = useState('');

  // Sync map pin to device location once it becomes available
  useEffect(() => {
    if (lat !== null && lat !== undefined) setPinLat(lat);
    if (lon !== null && lon !== undefined) setPinLon(lon);
  }, [lat, lon]);

  const toggleVibe = (v: VibeTag) =>
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  // Steps differ by mode: 'find' uses AI search flow (5 steps), 'explore'/'date' use post flow (4 steps)
  const isPostMode = planMode === 'explore' || planMode === 'date';
  const POST_STEPS = 4; // activity, when, neighborhood+vibe, details

  // Auto-generate plan name from activity + spot/neighborhood
  const autoGenName = (() => {
    const actLabel = ACTIVITY_OPTIONS.find(o => o.type === activityType)?.label ?? '';
    const spot = specificSpot.trim();
    if (spot) return `${actLabel} at ${spot}`;
    if (postNeighborhood) return `${actLabel} in ${postNeighborhood}`;
    return actLabel;
  })();
  const effectivePlanName = planName.trim() || autoGenName;

  const handleChatParse = async () => {
    if (!chatText.trim() || !user) return;
    const parsed = parsePlanText(chatText);

    // Resolve values: parsed result takes priority over any existing state
    const resolvedActivity  = parsed.activityType ?? activityType;
    const resolvedTime      = parsed.timePreset ?? timePreset;
    const resolvedNeighborhood = parsed.postNeighborhood ?? postNeighborhood;
    const resolvedVibes     = parsed.vibes ?? vibes;
    const resolvedSport     = parsed.sportType ?? sportType;
    const resolvedBar       = parsed.barType ?? barType;
    const resolvedCuisine   = parsed.cuisine ?? cuisine;
    const resolvedSpot      = parsed.specificSpot ?? specificSpot;
    const resolvedMode      = planMode ?? 'find';
    const isPost            = resolvedMode === 'explore' || resolvedMode === 'date';

    // Auto-compute a plan name from parsed data
    const actLabel = ACTIVITY_OPTIONS.find(o => o.type === resolvedActivity)?.label ?? '';
    const autoName = resolvedSpot
      ? `${actLabel} at ${resolvedSpot}`
      : resolvedNeighborhood
        ? `${actLabel} in ${resolvedNeighborhood}`
        : actLabel;
    const resolvedName = planName.trim() || autoName;

    // ── Direct launch if we have enough info ──────────────────────────────────
    if (resolvedActivity && resolvedTime) {
      setIsLaunching(true);
      try {
        if (isPost) {
          postPlan({
            creatorId: user.id,
            creatorName: user.name,
            creatorInstagram: user.instagram,
            creatorPhoto: user.photo,
            planType: resolvedMode === 'date' ? 'exclusive_date' : 'group_hangout',
            visibility: postVisibility,
            activityType: resolvedActivity,
            cuisine:      resolvedCuisine    ?? undefined,
            barType:      resolvedBar        ?? undefined,
            sportType:    resolvedSport      ?? undefined,
            specificSpot: resolvedSpot.trim() || undefined,
            planName:     resolvedName,
            description:  postDescription.trim() || chatText.trim() || undefined,
            neighborhood: resolvedNeighborhood || 'NYC',
            date:         selectedDate,
            timeStart:    resolvedTime.start,
            vibes:        resolvedVibes,
            groupSize:    resolvedMode === 'date' ? 2 : groupSize,
            maxAttendees: resolvedMode === 'date' ? 2 : undefined,
          });
          navigation.goBack();
        } else {
          const params: WhimParams = {
            activityType: resolvedActivity,
            cuisine:      resolvedCuisine    ?? undefined,
            barType:      resolvedBar        ?? undefined,
            sportType:    resolvedSport      ?? undefined,
            specificSpot: resolvedSpot.trim()  || undefined,
            timeStart:    resolvedTime.start,
            timeEnd:      resolvedTime.end,
            radiusMiles,
            vibes:        resolvedVibes,
            groupSize,
            notes:        chatText.trim()    || undefined,
            planName:     resolvedName       || undefined,
            whimDate:     selectedDate,
            pinLat:       pinLat ?? 40.7549,
            pinLon:       pinLon ?? -73.984,
            neighborhood: resolvedNeighborhood || undefined,
          };
          const whimId = await createWhim(params, user.id, user.name);
          navigation.replace('WhimDetail', { whimId });
          launchSearch(whimId, lat ?? 40.7549, lon ?? -73.984, weather);
          // In-app notification + schedule reminder
          pushNotif({
            type: 'whim_created',
            title: `Whim created 🎉`,
            body: `Your ${resolvedActivity} Whim for ${resolvedTime} is live. Finding the best spots now.`,
            data: { whimId },
          });
          if (resolvedTime?.start) scheduleWhimReminder(whimId, resolvedActivity ?? 'activity', resolvedTime.start);
        }
      } catch {
        Alert.alert('Oops', 'Something went wrong. Try adjusting your message.');
      } finally {
        setIsLaunching(false);
      }
      return;
    }

    // ── Not enough info — pre-fill state and fall back to filter step 0 ──────
    if (parsed.activityType) setActivityType(parsed.activityType);
    if (parsed.sportType)    setSportType(parsed.sportType);
    if (parsed.barType)      setBarType(parsed.barType);
    if (parsed.cuisine)      setCuisine(parsed.cuisine);
    if (parsed.timePreset)   setTimePreset(parsed.timePreset);
    if (parsed.postNeighborhood) setPostNeighborhood(parsed.postNeighborhood);
    if (parsed.vibes)        setVibes(parsed.vibes);
    if (parsed.specificSpot) setSpecificSpot(parsed.specificSpot);
    if (!planMode) setPlanMode('find');
    setChatMode(false);
    setStep(0);
  };

  const canProceed = () => {
    if (step === -1) return chatMode ? chatText.trim().length > 0 : planMode !== null;
    if (step === 0) return !!activityType;   // plan name is now optional
    if (step === 1) return timePreset !== null;
    if (isPostMode && step === 2) return postNeighborhood.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === -1) {
      if (chatMode) { handleChatParse(); return; }
      setStep(0);
      return;
    }
    const maxStep = isPostMode ? POST_STEPS - 1 : TOTAL_STEPS - 1;
    if (step < maxStep) setStep(s => s + 1);
    else if (isPostMode) handleLaunchPost();
    else handleLaunch();
  };

  const handleLaunchPost = async () => {
    if (!activityType || !timePreset || !user) return;
    setIsLaunching(true);
    try {
      postPlan({
        creatorId: user.id,
        creatorName: user.name,
        creatorInstagram: user.instagram,
        creatorPhoto: user.photo,
        planType: planMode === 'date' ? 'exclusive_date' : 'group_hangout',
        visibility: postVisibility,
        activityType,
        cuisine:     cuisine    ?? undefined,
        barType:     barType    ?? undefined,
        sportType:   sportType  ?? undefined,
        specificSpot: specificSpot.trim() || undefined,
        planName:    effectivePlanName,
        description: postDescription.trim() || undefined,
        neighborhood: postNeighborhood.trim(),
        date: selectedDate,
        timeStart: timePreset.start,
        vibes,
        groupSize: planMode === 'date' ? 2 : groupSize,
        maxAttendees: planMode === 'date' ? 2 : undefined,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Oops', 'Something went wrong posting your plan.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleLaunch = async () => {
    if (!activityType || !timePreset || !user) return;
    setIsLaunching(true);
    try {
      const params: WhimParams = {
        activityType,
        cuisine:           cuisine          ?? undefined,
        barType:           barType          ?? undefined,
        sportType:         sportType        ?? undefined,
        specificSpot:      specificSpot.trim() || undefined,
        timeStart:         timePreset.start,
        timeEnd:           timePreset.end,
        radiusMiles,
        vibes,
        groupSize,
        notes:             notes.trim()     || undefined,
        planName:          effectivePlanName || undefined,
        whimDate:          selectedDate,
        pinLat:            splitMode === 'split' ? undefined : pinLat,
        pinLon:            splitMode === 'split' ? undefined : pinLon,
        neighborhood:      splitMode === 'split' ? myNeighborhood || undefined : undefined,
        splitNeighborhood: splitMode === 'split' ? splitNeighborhood || undefined : undefined,
      };
      const whimId = await createWhim(params, user.id, user.name);
      navigation.replace('WhimDetail', { whimId });
      launchSearch(whimId, lat ?? 40.7549, lon ?? -73.984, weather);
      // In-app notification + schedule reminder
      pushNotif({
        type: 'whim_created',
        title: `Whim created 🎉`,
        body: `Your ${activityType ?? 'activity'} Whim for ${timePreset.label} is live. Finding spots now.`,
        data: { whimId },
      });
      if (timePreset?.start) scheduleWhimReminder(whimId, activityType ?? 'activity', timePreset.start);
    } catch {
      Alert.alert('Oops', 'Something went wrong starting your whim.');
    } finally {
      setIsLaunching(false);
    }
  };

  const maxSteps = isPostMode ? 4 : TOTAL_STEPS;
  const progressWidth = step < 0 ? 0 : ((step + 1) / maxSteps) * 100;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (step <= -1) navigation.goBack();
            else if (step === 0 && !seedMode) setStep(-1);
            else if (step === 0) navigation.goBack();
            else setStep(s => s - 1);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name={step === -1 ? 'close' : 'arrow-back'} size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressWidth}%` as any }]} />
        </View>
        <Text style={styles.stepLabel}>
          {step < 0 ? '' : `${step + 1}/${maxSteps}`}
        </Text>
      </View>

      {/* ── Chat / Filters toggle (only shown on step -1) ── */}
      {step === -1 && (
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, !chatMode && styles.modeToggleBtnActive]}
            onPress={() => setChatMode(false)}
            activeOpacity={0.8}
          >
            {!chatMode && (
              <LinearGradient
                colors={colors.gradients.primary}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
            <Ionicons name="options-outline" size={14} color={!chatMode ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeToggleText, !chatMode && styles.modeToggleTextActive]}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleBtn, chatMode && styles.modeToggleBtnActive]}
            onPress={() => setChatMode(true)}
            activeOpacity={0.8}
          >
            {chatMode && (
              <LinearGradient
                colors={colors.gradients.primary}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
            <Ionicons name="chatbubble-outline" size={14} color={chatMode ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeToggleText, chatMode && styles.modeToggleTextActive]}>Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step -1 Chat mode: natural language input ── */}
        {step === -1 && chatMode && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's the plan?</Text>
            <Text style={styles.stepSubtitle}>
              Describe it naturally — activity, vibe, neighborhood, time. The more detail, the better.
            </Text>
            <TextInput
              style={styles.chatInput}
              placeholder={
                'e.g. "Rooftop drinks in the West Village after work"\n"Pickleball at Chelsea Piers around noon"\n"Dinner at Via Carota Saturday at 8pm"'
              }
              placeholderTextColor={colors.textTertiary}
              value={chatText}
              onChangeText={setChatText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />
            {chatText.trim().length > 0 && (
              <View style={styles.chatHintRow}>
                <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                <Text style={styles.chatHint}>
                  Tap Continue to auto-fill the form — you can always adjust the details.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Step -1: Plan mode selector (filter mode) ── */}
        {step === -1 && !chatMode && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What kind of plan?</Text>
            <Text style={styles.stepSubtitle}>Choose how you want to use Whim today.</Text>

            {([
              {
                mode: 'find' as PlanMode,
                label: 'Find a spot',
                desc: 'AI picks the perfect venue for your crew. Just tell it what you want.',
                icon: 'search-outline',
                gradient: colors.gradients.primary,
              },
              {
                mode: 'explore' as PlanMode,
                label: 'Post to Explore',
                desc: 'Share a group plan or open invite. Anyone can see and join.',
                icon: 'globe-outline',
                gradient: ['#FF6B35', '#FF9A56'] as [string, string],
              },
              {
                mode: 'date' as PlanMode,
                label: 'Post a date plan',
                desc: 'One-on-one exclusive plan. You pick who joins.',
                icon: 'heart-outline',
                gradient: ['#FF3D6B', '#FF6B9D'] as [string, string],
              },
            ]).map(opt => {
              const isSelected = planMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                  onPress={() => setPlanMode(opt.mode)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={opt.gradient}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <View style={[styles.modeIcon, isSelected && styles.modeIconSelected]}>
                    <Ionicons
                      name={opt.icon as any}
                      size={22}
                      color={isSelected ? colors.textInverse : colors.primary}
                    />
                  </View>
                  <View style={styles.modeText}>
                    <Text style={[styles.modeLabel, isSelected && styles.modeLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.modeDesc, isSelected && styles.modeDescSelected]} numberOfLines={2}>
                      {opt.desc}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color="rgba(255,255,255,0.9)" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Step 0: Activity type ── */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's the plan?</Text>
            <Text style={styles.stepSubtitle}>Pick an activity to get started.</Text>

            <View style={styles.activityGrid}>
              {ACTIVITY_OPTIONS.map(opt => {
                const isSelected = activityType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    onPress={() => setActivityType(opt.type)}
                    style={[styles.activityCard, isSelected && styles.activityCardSelected]}
                    activeOpacity={0.8}
                  >
                    {isSelected ? (
                      <LinearGradient colors={colors.gradients.primary} style={StyleSheet.absoluteFillObject} />
                    ) : null}
                    <Ionicons
                      name={activityIcons[opt.type] as any}
                      size={24}
                      color={isSelected ? colors.textInverse : colors.primary}
                    />
                    <Text style={[styles.activityLabel, isSelected && styles.activityLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.activityDesc, isSelected && styles.activityDescSelected]} numberOfLines={2}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Cuisine sub-type ── */}
            {activityType === 'dinner' && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Cuisine <Text style={styles.nameOptional}>(optional)</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subScrollContent}>
                  {CUISINE_OPTIONS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.subChip, cuisine === c && styles.subChipActive]}
                      onPress={() => setCuisine(c === cuisine ? null : c)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.subChipText, cuisine === c && styles.subChipTextActive]}>
                        {cuisineLabels[c]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Bar type sub-type ── */}
            {activityType === 'drinks' && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Type of bar <Text style={styles.nameOptional}>(optional)</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subScrollContent}>
                  {BAR_TYPE_OPTIONS.map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.subChip, barType === b && styles.subChipActive]}
                      onPress={() => setBarType(b === barType ? null : b)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.subChipText, barType === b && styles.subChipTextActive]}>
                        {drinkTypeLabels[b]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Sport sub-type (activity & sports) ── */}
            {(activityType === 'activity' || activityType === 'sports') && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Activity type <Text style={styles.nameOptional}>(optional)</Text></Text>
                <View style={styles.sportGrid}>
                  {SPORT_OPTIONS.map(s => {
                    const active = sportType === s.type;
                    return (
                      <TouchableOpacity
                        key={s.type}
                        style={[styles.sportChip, active && styles.sportChipActive]}
                        onPress={() => setSportType(active ? null : s.type)}
                        activeOpacity={0.75}
                      >
                        {active && (
                          <LinearGradient
                            colors={colors.gradients.primary}
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          />
                        )}
                        <Ionicons
                          name={s.icon as any}
                          size={14}
                          color={active ? '#fff' : colors.primary}
                        />
                        <Text style={[styles.sportChipText, active && styles.sportChipTextActive]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Specific spot ── */}
            <View style={styles.subSection}>
              <Text style={styles.subLabel}>
                Specific spot{' '}
                <Text style={styles.nameOptional}>
                  {planMode === 'find' ? '(optional — AI will search here)' : '(optional)'}
                </Text>
              </Text>
              <View style={styles.spotInputWrap}>
                <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.spotInput}
                  placeholder={
                    activityType === 'drinks'  ? 'e.g. Employees Only, Amor y Amargo' :
                    activityType === 'dinner'  ? 'e.g. Via Carota, Don Angie' :
                    activityType === 'coffee'  ? 'e.g. Maman, Blue Bottle' :
                    activityType === 'activity'? 'e.g. Chelsea Piers, Brooklyn Boulders' :
                    'Enter a specific venue or spot…'
                  }
                  placeholderTextColor={colors.textTertiary}
                  value={specificSpot}
                  onChangeText={setSpecificSpot}
                  returnKeyType="done"
                  autoCorrect={false}
                />
                {specificSpot.length > 0 && (
                  <TouchableOpacity onPress={() => setSpecificSpot('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
              {planMode === 'find' && specificSpot.trim().length > 0 && (
                <View style={styles.spotHintRow}>
                  <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                  <Text style={styles.spotHint}>Whim will use this as the destination instead of searching</Text>
                </View>
              )}
            </View>

            {/* ── Plan name (optional, auto-generates) ── */}
            <View style={styles.nameSection}>
              <Text style={styles.nameLabel}>
                Plan name <Text style={styles.nameOptional}>(optional · auto-fills)</Text>
              </Text>
              <TextInput
                style={styles.nameInput}
                placeholder={effectivePlanName || 'e.g. Rooftop drinks Friday…'}
                placeholderTextColor={colors.textTertiary}
                value={planName}
                onChangeText={setPlanName}
                returnKeyType="done"
              />
            </View>
          </View>
        )}

        {/* ── Step 1: When ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>When?</Text>
            <Text style={styles.stepSubtitle}>Pick a date and your time window.</Text>

            {/* 2-week date picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.datePicker}
              contentContainerStyle={styles.datePickerContent}
            >
              {twoWeekDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDate === dayKey;
                const todayDay = isToday(day);
                return (
                  <TouchableOpacity
                    key={dayKey}
                    style={[styles.dateCell, isSelected && styles.dateCellSelected]}
                    onPress={() => setSelectedDate(dayKey)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateCellDay, isSelected && styles.dateCellTextSelected]}>
                      {todayDay ? 'Today' : format(day, 'EEE')}
                    </Text>
                    <Text style={[styles.dateCellNum, isSelected && styles.dateCellTextSelected, todayDay && !isSelected && styles.dateCellTodayNum]}>
                      {format(day, 'd')}
                    </Text>
                    <Text style={[styles.dateCellMonth, isSelected && styles.dateCellTextSelected]}>
                      {format(day, 'MMM')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time presets */}
            <Text style={styles.subLabel}>Time window</Text>
            <View style={styles.timeList}>
              {TIME_PRESETS.map(preset => {
                const isSelected = timePreset?.label === preset.label;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    onPress={() => setTimePreset(preset)}
                    style={[styles.timeCard, isSelected && styles.timeCardSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.timeCardLeft}>
                      <Text style={[styles.timeLabel, isSelected && styles.timeLabelSelected]}>
                        {preset.label}
                      </Text>
                      <Text style={[styles.timeRange, isSelected && styles.timeRangeSelected]}>
                        {preset.time}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Step 2: Where (map) — find mode only ── */}
        {!isPostMode && step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Where?</Text>
            <Text style={styles.stepSubtitle}>
              {splitMode === 'split'
                ? "Enter both neighborhoods and we'll meet in the middle."
                : 'Pin the area and set your radius.'}
            </Text>

            {/* Split-the-distance toggle */}
            <View style={styles.splitToggleRow}>
              <TouchableOpacity
                style={[styles.splitToggleBtn, splitMode === 'just_me' && styles.splitToggleBtnActive]}
                onPress={() => setSplitMode('just_me')}
                activeOpacity={0.8}
              >
                {splitMode === 'just_me' && (
                  <LinearGradient colors={colors.gradients.primary} style={StyleSheet.absoluteFillObject} />
                )}
                <Ionicons name="location-outline" size={14} color={splitMode === 'just_me' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.splitToggleText, splitMode === 'just_me' && styles.splitToggleTextActive]}>
                  Just me
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.splitToggleBtn, splitMode === 'split' && styles.splitToggleBtnActive]}
                onPress={() => setSplitMode('split')}
                activeOpacity={0.8}
              >
                {splitMode === 'split' && (
                  <LinearGradient colors={colors.gradients.primary} style={StyleSheet.absoluteFillObject} />
                )}
                <Ionicons name="git-merge-outline" size={14} color={splitMode === 'split' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.splitToggleText, splitMode === 'split' && styles.splitToggleTextActive]}>
                  Split the distance
                </Text>
              </TouchableOpacity>
            </View>

            {splitMode === 'just_me' ? (
              <MapRadiusPicker
                radiusMiles={radiusMiles}
                pinLat={pinLat}
                pinLon={pinLon}
                onRadiusChange={setRadiusMiles}
                onPinChange={(la, lo) => { setPinLat(la); setPinLon(lo); }}
              />
            ) : (
              <View style={styles.splitInputsWrap}>
                {/* My neighborhood */}
                <View style={styles.splitFieldWrap}>
                  <Text style={styles.splitFieldLabel}>📍 My area</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.splitNeighborhoodRow}
                  >
                    {NEIGHBORHOODS.map(n => (
                      <TouchableOpacity
                        key={`my_${n}`}
                        style={[styles.neighborhoodChip, myNeighborhood === n && styles.neighborhoodChipSelected]}
                        onPress={() => setMyNeighborhood(myNeighborhood === n ? '' : n)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.neighborhoodChipText, myNeighborhood === n && styles.neighborhoodChipTextSelected]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Divider with icon */}
                <View style={styles.splitDivider}>
                  <View style={styles.splitDividerLine} />
                  <View style={styles.splitDividerBadge}>
                    <Ionicons name="swap-vertical-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={styles.splitDividerLine} />
                </View>

                {/* Their neighborhood */}
                <View style={styles.splitFieldWrap}>
                  <Text style={styles.splitFieldLabel}>📍 Their area</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.splitNeighborhoodRow}
                  >
                    {NEIGHBORHOODS.map(n => (
                      <TouchableOpacity
                        key={`split_${n}`}
                        style={[styles.neighborhoodChip, splitNeighborhood === n && styles.neighborhoodChipSelected]}
                        onPress={() => setSplitNeighborhood(splitNeighborhood === n ? '' : n)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.neighborhoodChipText, splitNeighborhood === n && styles.neighborhoodChipTextSelected]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {myNeighborhood && splitNeighborhood && (
                  <View style={styles.splitHintRow}>
                    <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                    <Text style={styles.splitHintText}>
                      Whim will find spots between {myNeighborhood} and {splitNeighborhood}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Step 3: Vibe — find mode only ── */}
        {!isPostMode && step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's the vibe?</Text>
            <Text style={styles.stepSubtitle}>Pick as many as you want — or skip for a broader search.</Text>
            <View style={styles.vibeGrid}>
              {VIBE_OPTIONS.map(v => (
                <Chip
                  key={v}
                  label={vibeLabels[v]}
                  selected={vibes.includes(v)}
                  onPress={() => toggleVibe(v)}
                />
              ))}
            </View>
            {vibes.length === 0 && (
              <Text style={styles.hintText}>No vibe selected = cast the widest net possible.</Text>
            )}
          </View>
        )}

        {/* ── Step 4: Group + notes — find mode only ── */}
        {!isPostMode && step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Who's coming?</Text>
            <Text style={styles.stepSubtitle}>You can invite people after you start.</Text>

            <View style={styles.groupGrid}>
              {GROUP_SIZES.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setGroupSize(s)}
                  style={[styles.groupChip, groupSize === s && styles.groupChipSelected]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.groupChipText, groupSize === s && styles.groupChipTextSelected]}>
                    {s === 1 ? 'Solo' : s === 10 ? '10+' : `${s}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.subLabel}>Any specifics? <Text style={styles.nameOptional}>(optional)</Text></Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g. must have outdoor seating, budget-friendly, somewhere I haven't been..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
        {/* ── Post mode Step 2: Where + Vibe ── */}
        {isPostMode && step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Where?</Text>
            <Text style={styles.stepSubtitle}>Pick a neighborhood and set the vibe.</Text>

            <View style={styles.subSection}>
              <Text style={styles.subLabel}>Neighborhood</Text>
              <View style={styles.neighborhoodGrid}>
                {NEIGHBORHOODS.map(n => {
                  const isSelected = postNeighborhood === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.neighborhoodChip, isSelected && styles.neighborhoodChipSelected]}
                      onPress={() => setPostNeighborhood(isSelected ? '' : n)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.neighborhoodChipText, isSelected && styles.neighborhoodChipTextSelected]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subLabel}>Vibe <Text style={styles.nameOptional}>(optional)</Text></Text>
              <View style={styles.vibeGrid}>
                {VIBE_OPTIONS.map(v => (
                  <Chip
                    key={v}
                    label={vibeLabels[v]}
                    selected={vibes.includes(v)}
                    onPress={() => toggleVibe(v)}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Post mode Step 3: Details + Visibility ── */}
        {isPostMode && step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Details</Text>
            <Text style={styles.stepSubtitle}>Tell people what you're looking for.</Text>

            <View style={styles.notesSection}>
              <Text style={styles.subLabel}>
                Description <Text style={styles.nameOptional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder={
                  planMode === 'date'
                    ? 'e.g. Looking for someone to grab cocktails with after work…'
                    : 'e.g. Low-key Friday drinks, any takers? Bringing 2–3 people…'
                }
                placeholderTextColor={colors.textTertiary}
                value={postDescription}
                onChangeText={setPostDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subLabel}>Who can see this?</Text>
              {VISIBILITY_OPTIONS.map(opt => {
                const isSelected = postVisibility === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.visibilityCard, isSelected && styles.visibilityCardSelected]}
                    onPress={() => setPostVisibility(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.visibilityIcon, isSelected && styles.visibilityIconSelected]}>
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={isSelected ? colors.textInverse : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.visibilityLabel, isSelected && styles.visibilityLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.visibilityDesc, isSelected && styles.visibilityDescSelected]}>
                        {opt.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {planMode === 'explore' && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Group size</Text>
                <View style={styles.groupGrid}>
                  {GROUP_SIZES.map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setGroupSize(s)}
                      style={[styles.groupChip, groupSize === s && styles.groupChipSelected]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.groupChipText, groupSize === s && styles.groupChipTextSelected]}>
                        {s === 1 ? 'Solo' : s === 10 ? '10+' : `${s}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label={
            isPostMode && step === POST_STEPS - 1
              ? 'Post Plan'
              : !isPostMode && step === TOTAL_STEPS - 1
              ? 'Find spots'
              : 'Continue'
          }
          onPress={handleNext}
          disabled={!canProceed()}
          loading={isLaunching}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressBar: {
    flex: 1, height: 3,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  stepLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontWeight: typography.weights.medium,
    width: 28,
    textAlign: 'right',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  stepContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  stepTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: -spacing.sm,
  },
  subLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  // Activity grid
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  activityCard: {
    width: (width - spacing.base * 2 - spacing.md) / 2,
    borderRadius: radii.xl,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.xs,
    ...shadows.sm,
  },
  activityCardSelected: { borderColor: 'transparent' },
  activityLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  activityLabelSelected: { color: colors.textInverse },
  activityDesc: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 17,
  },
  activityDescSelected: { color: 'rgba(255,255,255,0.75)' },
  // Subcategory
  subSection: { gap: spacing.xs },
  subScrollContent: { gap: spacing.xs, paddingVertical: 2 },
  subChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subChipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  subChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  subChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },

  // Plan name
  nameSection: { gap: spacing.xs },
  nameLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  nameOptional: {
    fontWeight: typography.weights.regular,
    color: colors.textTertiary,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Date picker
  datePicker: { marginHorizontal: -spacing.base },
  datePickerContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  dateCell: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 58,
    gap: 2,
    ...shadows.sm,
  },
  dateCellSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  dateCellDay: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  dateCellNum: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    color: colors.text,
  },
  dateCellMonth: {
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  dateCellTodayNum: { color: colors.primary },
  dateCellTextSelected: { color: colors.textInverse },
  // Time
  timeList: { gap: spacing.sm },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  timeCardSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  timeCardLeft: { flex: 1, gap: 2 },
  timeLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  timeLabelSelected: { color: colors.textInverse },
  timeRange: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  timeRangeSelected: { color: 'rgba(255,255,255,0.6)' },
  // Vibe
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hintText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Group
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupChip: {
    width: 58, height: 58,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  groupChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  groupChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  groupChipTextSelected: { color: colors.textInverse },
  // Notes
  notesSection: { gap: spacing.xs },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    fontSize: typography.sizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  // Mode selector cards (step -1)
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  modeCardSelected: { borderColor: 'transparent' },
  modeIcon: {
    width: 44, height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  modeText: { flex: 1, gap: 3 },
  modeLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modeLabelSelected: { color: colors.textInverse },
  modeDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  modeDescSelected: { color: 'rgba(255,255,255,0.65)' },
  // Neighborhood
  neighborhoodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  neighborhoodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  neighborhoodChipSelected: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  neighborhoodChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  neighborhoodChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  // Visibility selector
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  visibilityCardSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  visibilityIcon: {
    width: 36, height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  visibilityLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  visibilityLabelSelected: { color: colors.textInverse },
  visibilityDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  visibilityDescSelected: { color: 'rgba(255,255,255,0.6)' },

  // ── Chat / Filters toggle ──
  modeToggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  modeToggleBtnActive: { overflow: 'hidden' },
  modeToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  modeToggleTextActive: { color: '#fff', fontWeight: typography.weights.bold },

  // ── Chat input ──
  chatInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
    minHeight: 140,
    lineHeight: 22,
  },
  chatHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  chatHint: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // ── Sport sub-types ──
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  sportChipActive: { borderColor: 'transparent' },
  sportChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  sportChipTextActive: { color: '#fff', fontWeight: typography.weights.bold },

  // ── Specific spot input ──
  spotInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  spotInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  spotHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  spotHint: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontStyle: 'italic',
  },

  // ── Split-the-distance ──────────────────────────────────────────────────────
  splitToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  splitToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  splitToggleBtnActive: {
    borderColor: 'transparent',
  },
  splitToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  splitToggleTextActive: {
    color: '#fff',
    fontWeight: typography.weights.bold,
  },

  splitInputsWrap: {
    gap: spacing.base,
  },
  splitFieldWrap: {
    gap: spacing.xs,
  },
  splitFieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  splitNeighborhoodRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  splitDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  splitDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  splitDividerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  splitHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '0C',
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  splitHintText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    flex: 1,
    fontStyle: 'italic',
  },
});
