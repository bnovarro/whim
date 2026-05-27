import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, spacing, radii, shadows } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'> };

const PROMPTS = [
  'Favorite restaurant?',
  'Go-to drink order?',
  'Best spontaneous memory?',
  'Always down for...',
];

export default function ProfileSetupScreen({ navigation }: Props) {
  const { user, updateInstagram, updateBeli, updateSpotify, updateBio, updateProfilePhoto, updatePrompts } = useAuthStore();

  const [instagram, setInstagram] = useState('');
  const [beli,      setBeli]      = useState('');
  const [spotify,   setSpotify]   = useState('');
  const [bio,       setBio]       = useState('');
  const [answers,   setAnswers]   = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);

  const handlePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to set a profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      await updateProfilePhoto(result.assets[0].uri);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const saves: Promise<void>[] = [];
      if (instagram.trim()) saves.push(updateInstagram(instagram));
      if (beli.trim())      saves.push(updateBeli(beli));
      if (spotify.trim())   saves.push(updateSpotify(spotify));
      if (bio.trim())       saves.push(updateBio(bio));
      const filledPrompts = Object.fromEntries(
        Object.entries(answers).filter(([, v]) => v.trim())
      );
      if (Object.keys(filledPrompts).length) saves.push(updatePrompts(filledPrompts));
      await Promise.all(saves);
      navigation.replace('Main', { screen: 'HomeTab' } as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Set up your profile</Text>
            <Text style={s.subtitle}>Help people know who they're planning with.</Text>
          </View>

          {/* Profile photo */}
          <TouchableOpacity style={s.photoBtn} onPress={handlePhoto} activeOpacity={0.8}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={s.photo} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="camera-outline" size={30} color={colors.textTertiary} />
                <Text style={s.photoHint}>Add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Social handles */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Socials</Text>

            <SocialField icon="logo-instagram" placeholder="Instagram handle" value={instagram} onChangeText={v => setInstagram(v.replace(/^@/, ''))} />
            <SocialField icon="restaurant-outline" placeholder="Beli handle" value={beli} onChangeText={v => setBeli(v.replace(/^@/, ''))} label="Beli" />
            <SocialField icon="musical-notes-outline" placeholder="Spotify username" value={spotify} onChangeText={v => setSpotify(v.replace(/^@/, ''))} label="Spotify" />
          </View>

          {/* Bio */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Bio</Text>
            <TextInput
              style={[s.input, s.bioInput]}
              placeholder="Tell people a little about yourself..."
              placeholderTextColor={colors.textTertiary}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
            />
            <Text style={s.charCount}>{bio.length}/150</Text>
          </View>

          {/* Prompts */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Prompts</Text>
            <Text style={s.sectionSubtitle}>Show up on your profile — answer any you like.</Text>
            {PROMPTS.map(prompt => (
              <View key={prompt} style={s.promptBlock}>
                <Text style={s.promptQ}>{prompt}</Text>
                <TextInput
                  style={s.input}
                  placeholder="Your answer..."
                  placeholderTextColor={colors.textTertiary}
                  value={answers[prompt] ?? ''}
                  onChangeText={v => setAnswers(a => ({ ...a, [prompt]: v }))}
                  returnKeyType="next"
                />
              </View>
            ))}
          </View>

          {/* Finish */}
          <TouchableOpacity style={s.finishBtn} onPress={handleFinish} activeOpacity={0.85} disabled={saving}>
            <Text style={s.finishText}>{saving ? 'Saving...' : 'Finish setup'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('Main', { screen: 'HomeTab' } as any)} style={s.skipBtn}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SocialField({ icon, placeholder, value, onChangeText, label }: {
  icon: any; placeholder: string; value: string; onChangeText: (v: string) => void; label?: string;
}) {
  return (
    <View style={s.socialRow}>
      <View style={s.socialIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={s.atWrap}>
        <Text style={s.atSign}>@</Text>
        <TextInput
          style={[s.input, s.socialInput]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },

  header: { paddingTop: spacing['2xl'], marginBottom: spacing['2xl'], gap: spacing.sm },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: { fontSize: typography.sizes.base, color: colors.textSecondary },

  photoBtn: { alignSelf: 'center', marginBottom: spacing['2xl'] },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    gap: spacing.xs,
  },
  photoHint: { fontSize: typography.sizes.xs, color: colors.textTertiary },

  section: { marginBottom: spacing.xl, gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs },

  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bioInput: { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.md },
  charCount: { fontSize: typography.sizes.xs, color: colors.textTertiary, alignSelf: 'flex-end' },

  socialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  socialIcon: {
    width: 36, height: 36, borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  atWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  atSign: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    paddingLeft: spacing.sm,
    paddingRight: 2,
  },
  socialInput: { flex: 1 },

  promptBlock: { gap: spacing.xs, marginBottom: spacing.sm },
  promptQ: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },

  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.base + 4,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  finishText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.base, marginTop: spacing.xs },
  skipText: { fontSize: typography.sizes.sm, color: colors.textTertiary },
});
