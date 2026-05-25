import { create } from 'zustand';
import { ActivityType, VibeTag } from '../types';

export type InterestedIn = 'men' | 'women' | 'everyone';

interface PreferencesState {
  // Dating tab filters
  interestedIn: InterestedIn;
  ageRange: { min: number; max: number };
  activityPrefs: ActivityType[]; // empty = all
  vibePrefs: VibeTag[];          // empty = all
  neighborhoodPrefs: string[];   // empty = all

  // Actions
  setInterestedIn: (v: InterestedIn) => void;
  setAgeRange: (range: { min: number; max: number }) => void;
  toggleActivityPref: (a: ActivityType) => void;
  toggleVibePref: (v: VibeTag) => void;
  toggleNeighborhoodPref: (n: string) => void;
  resetPreferences: () => void;
}

const DEFAULT_STATE = {
  interestedIn: 'everyone' as InterestedIn,
  ageRange: { min: 21, max: 45 },
  activityPrefs: [] as ActivityType[],
  vibePrefs: [] as VibeTag[],
  neighborhoodPrefs: [] as string[],
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULT_STATE,

  setInterestedIn: (v) => set({ interestedIn: v }),

  setAgeRange: (range) => set({ ageRange: range }),

  toggleActivityPref: (a) => {
    const current = get().activityPrefs;
    set({
      activityPrefs: current.includes(a)
        ? current.filter(x => x !== a)
        : [...current, a],
    });
  },

  toggleVibePref: (v) => {
    const current = get().vibePrefs;
    set({
      vibePrefs: current.includes(v)
        ? current.filter(x => x !== v)
        : [...current, v],
    });
  },

  toggleNeighborhoodPref: (n) => {
    const current = get().neighborhoodPrefs;
    set({
      neighborhoodPrefs: current.includes(n)
        ? current.filter(x => x !== n)
        : [...current, n],
    });
  },

  resetPreferences: () => set(DEFAULT_STATE),
}));
