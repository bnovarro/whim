import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True once you've pasted real credentials into .env.
 * While false the stores fall back to local mock data so the app stays
 * fully usable without a Supabase project.
 */
export const SUPABASE_CONFIGURED =
  SUPABASE_URL.length > 0 && !SUPABASE_URL.includes('your-project-ref');

export const supabase = createClient(
  SUPABASE_CONFIGURED ? SUPABASE_URL      : 'https://placeholder.supabase.co',
  SUPABASE_CONFIGURED ? SUPABASE_ANON_KEY : 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
