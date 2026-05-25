import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEventsForDate, createCalendarEvent, GCalEvent } from '../lib/googleCalendar';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'whim_google_cal_token';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarState {
  /** True when user has linked Google Calendar */
  isLinked: boolean;
  /** Short-lived Google access token (used for API calls, in-memory only) */
  accessToken: string | null;
  /** Today's events from Google Calendar */
  todayEvents: GCalEvent[];
  /** Whether we're currently fetching */
  isSyncing: boolean;

  /** Load a previously stored token and fetch today's events */
  loadStoredToken:      ()                        => Promise<void>;
  /** Save a fresh access token (called after Google OAuth flow) */
  saveToken:            (token: string)           => Promise<void>;
  /** Unlink — wipes the token */
  unlinkCalendar:       ()                        => Promise<void>;
  /** Fetch today's events; call this on app focus or after linking */
  syncToday:            ()                        => Promise<void>;
  /** Add a plan to the user's primary Google Calendar */
  addPlanToCalendar:    (opts: {
    title: string; description?: string;
    date: string; timeStart: string; neighborhood: string;
  })                                              => Promise<boolean>;
  /** True if today has calendar events (user is busy via GCal) */
  isBusyTodayViaGCal:  boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCalendarStore = create<CalendarState>((set, get) => ({
  isLinked:           false,
  accessToken:        null,
  todayEvents:        [],
  isSyncing:          false,
  isBusyTodayViaGCal: false,

  loadStoredToken: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      set({ accessToken: stored, isLinked: true });
      await get().syncToday();
    } catch {
      // non-fatal — calendar is optional
    }
  },

  saveToken: async (token) => {
    await AsyncStorage.setItem(STORAGE_KEY, token);
    set({ accessToken: token, isLinked: true });
    await get().syncToday();
  },

  unlinkCalendar: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ isLinked: false, accessToken: null, todayEvents: [], isBusyTodayViaGCal: false });
  },

  syncToday: async () => {
    const { accessToken } = get();
    if (!accessToken) return;
    set({ isSyncing: true });
    try {
      const today = new Date().toISOString().slice(0, 10);
      const events = await fetchEventsForDate(accessToken, today);
      set({
        todayEvents:        events,
        isBusyTodayViaGCal: events.length > 0,
        isSyncing:          false,
      });
    } catch (err: any) {
      set({ isSyncing: false });
      if (err?.message === 'EXPIRED') {
        // Token expired — clear it so we prompt re-link
        await get().unlinkCalendar();
      }
    }
  },

  addPlanToCalendar: async (opts) => {
    const { accessToken } = get();
    if (!accessToken) return false;
    try {
      const result = await createCalendarEvent(accessToken, opts);
      return !!result;
    } catch {
      return false;
    }
  },
}));
