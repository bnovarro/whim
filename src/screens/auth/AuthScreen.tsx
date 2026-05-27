import 'expo-auth-session';
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useCalendarStore } from '../../store/calendarStore';
import { colors, typography, spacing, radii, shadows } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
  route: RouteProp<RootStackParamList, 'Auth'>;
};

// ─── Google sign-in button ─────────────────────────────────────────────────────

function GoogleButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity style={gStyles.btn} onPress={onPress} activeOpacity={0.82} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {/* Google "G" logo using colored circles */}
          <View style={gStyles.gLogo}>
            <Text style={gStyles.gText}>G</Text>
          </View>
          <Text style={gStyles.label}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const gStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.base + 2,
    paddingHorizontal: spacing['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  gLogo: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
  },
  gText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 16,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function AuthScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const [tab, setTab]                   = useState<'login' | 'signup'>(mode);
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [phone, setPhone]               = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);

  const { login, signup, loginWithGoogle, isLoading } = useAuthStore();
  const { saveToken } = useCalendarStore();

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:         process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId:  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    redirectUri: makeRedirectUri({ scheme: 'whim' }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (!authentication) return;
      setGoogleLoading(true);

      loginWithGoogle(authentication.idToken ?? '', authentication.accessToken)
        .then(async () => {
          // Persist the calendar access token so the user doesn't have to re-link
          if (authentication.accessToken) {
            await saveToken(authentication.accessToken);
          }
        })
        .catch(() => Alert.alert('Sign-in failed', 'Try again or use email instead.'))
        .finally(() => setGoogleLoading(false));
    }
  }, [response]);

  // ── Email/password submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Hold on', 'Enter your email and password.');
      return;
    }
    if (tab === 'signup') {
      if (!firstName.trim()) { Alert.alert('Hold on', 'Enter your first name.'); return; }
      if (!lastName.trim())  { Alert.alert('Hold on', 'Enter your last name.');  return; }
      if (password.length < 8) { Alert.alert('Weak password', 'Password must be at least 8 characters.'); return; }
      if (password !== confirmPassword) { Alert.alert('Passwords don\'t match', 'Make sure both password fields are the same.'); return; }
    }
    try {
      if (tab === 'signup') {
        await signup(firstName.trim(), lastName.trim(), phone.trim(), email.trim(), password);
        navigation.replace('ProfileSetup');
      } else {
        await login(email.trim(), password);
      }
    } catch (e: any) {
      Alert.alert('Oops', e?.message ?? 'Something went wrong. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {tab === 'signup' ? 'Create account' : 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>
              {tab === 'signup' ? 'Start making spontaneous plans.' : 'Good to see you again.'}
            </Text>
          </View>

          {/* Google button */}
          <GoogleButton onPress={() => promptAsync()} loading={googleLoading} />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Tab switcher */}
          <View style={styles.tabs}>
            {(['login', 'signup'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'login' ? 'Sign in' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>

            {tab === 'signup' && (
              <View style={styles.nameRow}>
                <Field label="First name" required style={styles.nameField}>
                  <TextInput
                    style={styles.input}
                    placeholder="Alex"
                    placeholderTextColor={colors.textTertiary}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </Field>
                <Field label="Last name" required style={styles.nameField}>
                  <TextInput
                    style={styles.input}
                    placeholder="Chen"
                    placeholderTextColor={colors.textTertiary}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </Field>
              </View>
            )}

            {tab === 'signup' && (
              <Field label="Phone number" optional>
                <TextInput
                  style={styles.input}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </Field>
            )}

            <Field label="Email" required>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </Field>

            <Field label="Password" required>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { paddingRight: spacing['3xl'] + 4, flex: 1 }]}
                  placeholder={tab === 'signup' ? 'Create a password (8+ chars)' : 'Your password'}
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType={tab === 'signup' ? 'next' : 'done'}
                  onSubmitEditing={tab === 'login' ? handleSubmit : undefined}
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </Field>

            {tab === 'signup' && (
              <Field label="Confirm password" required>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[
                      styles.input,
                      { paddingRight: spacing['3xl'] + 4, flex: 1 },
                      confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
                    ]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.textTertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorHint}>Passwords don't match</Text>
                )}
              </Field>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <LinearGradient
                colors={colors.gradients.primary}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGrad}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {tab === 'signup' ? 'Create account' : 'Sign in'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {tab === 'signup' && (
              <Text style={styles.profileHint}>
                Next you'll set up your profile — photo, bio, and more.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, required, optional, style, children }: {
  label: string; required?: boolean; optional?: boolean; style?: any; children: React.ReactNode;
}) {
  return (
    <View style={[styles.fieldGroup, style]}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional && <Text style={styles.fieldOptional}>optional · skip for now</Text>}
      </View>
      {children}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  flex:    { flex: 1 },
  scroll:  { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },

  backBtn: {
    marginTop: spacing.base,
    marginBottom: spacing.xl,
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
  },

  header: { marginBottom: spacing.xl, gap: spacing.sm },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.heavy,
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: { fontSize: typography.sizes.base, color: colors.textSecondary },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { fontSize: typography.sizes.sm, color: colors.textTertiary },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.xl,
    padding: 3,
    marginBottom: spacing.xl,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.sm + 2,
    alignItems: 'center', borderRadius: radii.lg,
  },
  tabBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textTertiary,
  },
  tabTextActive: {
    fontWeight: typography.weights.bold,
    color: colors.text,
  },

  form: { gap: spacing.base },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameField: { flex: 1 },

  fieldGroup: { gap: spacing.xs },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.xs },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  fieldOptional: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  fieldHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
    marginTop: 2,
  },

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
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: {
    position: 'absolute', right: spacing.base,
    alignSelf: 'center',
  },
  atRow: { flexDirection: 'row', alignItems: 'center' },
  atSign: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  atInput: { flex: 1 },

  submitBtn: { marginTop: spacing.sm, borderRadius: radii.xl, overflow: 'hidden' },
  submitGrad: {
    paddingVertical: spacing.base + 4,
    alignItems: 'center', justifyContent: 'center',
  },
  submitText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },

  inputError: {
    borderColor: '#E53E3E',
    borderWidth: 1.5,
  },
  errorHint: {
    fontSize: typography.sizes.xs,
    color: '#E53E3E',
    marginLeft: spacing.xs,
    marginTop: 2,
  },
  profileHint: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
