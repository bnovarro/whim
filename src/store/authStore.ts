import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { User, AvailabilityVisibility } from '../types';

// ─── Mock helpers (used when Supabase isn't configured yet) ───────────────────

const MOCK_STORAGE_KEY = 'whim_user';

function makeMockUser(name: string, email: string, extras?: Partial<User>): User {
  return {
    id:       `local_${email.split('@')[0]}_${Date.now()}`,
    name,
    username: email.split('@')[0],
    city:     'New York',
    friends:  [],
    availabilityVisibility: 'private',
    ...extras,
  };
}

async function saveMockUser(user: User) {
  await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user));
}

async function loadMockUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  friends: User[];
  isLoading: boolean;
  isAuthenticated: boolean;

  loadStoredSession:    ()                                                                          => Promise<void>;
  login:               (email: string, password: string)                                          => Promise<void>;
  signup:              (name: string, email: string, password: string, neighborhood?: string, instagram?: string) => Promise<void>;
  loginWithGoogle:     (idToken: string, accessToken: string)                                     => Promise<void>;
  logout:              ()                                                                          => Promise<void>;

  updatePushToken:     (token: string)                                       => void;
  updateAddress:       (address: string)                                     => Promise<void>;
  updateInstagram:     (handle: string)                                      => Promise<void>;
  updateBeli:          (handle: string)                                      => Promise<void>;
  updateBio:           (bio: string)                                         => Promise<void>;
  updatePhotos:               (photos: string[])                             => Promise<void>;
  updateProfilePhoto:         (uri: string | null)                           => Promise<void>;
  updateAvailabilityVisibility: (v: AvailabilityVisibility)                  => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch the profiles row for a given auth UID and return a User object. */
async function fetchProfile(uid: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (error || !data) return null;

  return {
    id:                      data.id,
    name:                    data.name,
    username:                data.username ?? '',
    city:                    data.city ?? 'New York',
    homeAddress:             data.home_address ?? undefined,
    instagram:               data.instagram ?? undefined,
    beli:                    data.beli ?? undefined,
    bio:                     data.bio ?? undefined,
    photo:                   data.photo ?? undefined,
    photos:                  data.photos ?? [],
    pushToken:               data.push_token ?? undefined,
    availabilityVisibility:  (data.availability_visibility as AvailabilityVisibility) ?? 'private',
    friends:                 [],
  };
}

/** Upload a local image URI to Supabase Storage and return the public URL. */
async function uploadPhoto(userId: string, uri: string): Promise<string> {
  const ext  = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  // Fetch the local file as an ArrayBuffer (works in RN 0.73+)
  const response    = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  friends:         [],
  isLoading:       true,
  isAuthenticated: false,

  // ── Session bootstrap ────────────────────────────────────────────────────
  loadStoredSession: async () => {
    if (!SUPABASE_CONFIGURED) {
      const user = await loadMockUser();
      set({ user, isAuthenticated: !!user, isLoading: false });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const user = await fetchProfile(session.user.id);
      set({ user, isAuthenticated: !!user, isLoading: false });
    } else {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await fetchProfile(session.user.id);
        set({ user, isAuthenticated: !!user });
      }
      if (event === 'SIGNED_OUT') {
        set({ user: null, friends: [], isAuthenticated: false });
      }
    });
  },

  // ── Auth actions ─────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 600)); // feel natural

    if (!SUPABASE_CONFIGURED) {
      // Mock: any credentials work; restore a saved session if same email
      let user = await loadMockUser();
      if (!user || user.username !== email.split('@')[0]) {
        user = makeMockUser(email.split('@')[0], email);
      }
      await saveMockUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { set({ isLoading: false }); throw new Error(error.message); }
    const user = data.user ? await fetchProfile(data.user.id) : null;
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  signup: async (name, email, password, neighborhood, instagram) => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 700));

    if (!SUPABASE_CONFIGURED) {
      const user = makeMockUser(name, email, {
        homeAddress: neighborhood,
        instagram:   instagram ? instagram.replace(/^@/, '') : undefined,
      });
      await saveMockUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { set({ isLoading: false }); throw new Error(error.message); }

    // Supabase returns user:null (no error) when email is already registered —
    // it hides the distinction to prevent email enumeration.
    if (!data.user) {
      set({ isLoading: false });
      throw new Error('An account with that email already exists. Try signing in instead.');
    }

    // Insert the profile row. The handle_new_user trigger may have already done
    // this; "on conflict do nothing" in the trigger means our insert is the
    // authoritative one (we have the display name from the form).
    const { error: profileError } = await supabase.from('profiles').insert({
      id:           data.user.id,
      name,
      username:     email.split('@')[0],
      city:         'New York',
      home_address: neighborhood ?? null,
      instagram:    instagram ? instagram.replace(/^@/, '') : null,
    });
    // Ignore duplicate-key errors — the trigger beat us to it
    if (profileError && !profileError.message.includes('duplicate') && !profileError.message.includes('already exists')) {
      set({ isLoading: false });
      throw new Error(profileError.message);
    }

    // If Supabase requires email confirmation, data.session is null here.
    // In that case we can't fetch the profile yet — tell the user to confirm.
    if (!data.session) {
      set({ isLoading: false });
      throw new Error('Check your email — we sent you a confirmation link. Come back and sign in after confirming.');
    }

    const user = await fetchProfile(data.user.id);
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  loginWithGoogle: async (idToken, _accessToken) => {
    set({ isLoading: true });

    if (!SUPABASE_CONFIGURED) {
      const user = makeMockUser('Google User', 'google@example.com', { photo: undefined });
      await saveMockUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      return;
    }

    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) { set({ isLoading: false }); throw new Error(error.message); }
    if (!data.user) { set({ isLoading: false }); throw new Error('Google sign-in failed'); }

    const meta = data.user.user_metadata ?? {};
    await supabase.from('profiles').upsert({
      id:       data.user.id,
      name:     meta.full_name ?? meta.name ?? 'Whim User',
      username: (data.user.email ?? '').split('@')[0],
      photo:    meta.avatar_url ?? meta.picture ?? null,
      city:     'New York',
    }, { onConflict: 'id', ignoreDuplicates: true });

    const user = await fetchProfile(data.user.id);
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  logout: async () => {
    if (!SUPABASE_CONFIGURED) {
      await AsyncStorage.removeItem(MOCK_STORAGE_KEY);
      set({ user: null, friends: [], isAuthenticated: false });
      return;
    }
    await supabase.auth.signOut();
    set({ user: null, friends: [], isAuthenticated: false });
  },

  // ── Profile update actions ────────────────────────────────────────────────
  // Each action updates local state immediately; DB write is skipped in mock mode.

  updatePushToken: (token) => {
    const user = get().user;
    if (!user) return;
    if (SUPABASE_CONFIGURED) supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    set({ user: { ...user, pushToken: token } });
  },

  updateAddress: async (address) => {
    const user = get().user;
    if (!user) return;
    if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ home_address: address }).eq('id', user.id);
    const updated = { ...user, homeAddress: address };
    if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
    set({ user: updated });
  },

  updateInstagram: async (handle) => {
    const user = get().user;
    if (!user) return;
    const clean = handle.replace(/^@/, '').trim();
    if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ instagram: clean }).eq('id', user.id);
    const updated = { ...user, instagram: clean };
    if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
    set({ user: updated });
  },

  updateBeli: async (handle) => {
    const user = get().user;
    if (!user) return;
    const clean = handle.replace(/^@/, '').trim();
    if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ beli: clean }).eq('id', user.id);
    const updated = { ...user, beli: clean };
    if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
    set({ user: updated });
  },

  updateBio: async (bio) => {
    const user = get().user;
    if (!user) return;
    const trimmed = bio.trim();
    if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ bio: trimmed }).eq('id', user.id);
    const updated = { ...user, bio: trimmed };
    if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
    set({ user: updated });
  },

  updatePhotos: async (photos) => {
    const user = get().user;
    if (!user) return;
    const limited = photos.slice(0, 6);
    if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ photos: limited }).eq('id', user.id);
    const updated = { ...user, photos: limited };
    if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
    set({ user: updated });
  },

  updateProfilePhoto: async (uri) => {
    const user = get().user;
    if (!user) return;

    if (!uri) {
      if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ photo: null }).eq('id', user.id);
      const updated = { ...user, photo: undefined };
      if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
      set({ user: updated });
      return;
    }

    // Without Supabase: keep the local URI directly (photos only visible on this device)
    if (!SUPABASE_CONFIGURED) {
      const updated = { ...user, photo: uri };
      await saveMockUser(updated);
      set({ user: updated });
      return;
    }

    const publicUrl = await uploadPhoto(user.id, uri);
    await supabase.from('profiles').update({ photo: publicUrl }).eq('id', user.id);
    set({ user: { ...user, photo: publicUrl } });
  },

  updateAvailabilityVisibility: async (visibility) => {
    const user = get().user;
    if (!user) return;
    if (SUPABASE_CONFIGURED) await supabase.from('profiles').update({ availability_visibility: visibility }).eq('id', user.id);
    const updated = { ...user, availabilityVisibility: visibility };
    if (!SUPABASE_CONFIGURED) await saveMockUser(updated);
    set({ user: updated });
  },
}));
