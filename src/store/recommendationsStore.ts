import { create } from 'zustand';
import { WeatherData } from '../types';
import { generateDailyRecs, PlanRec } from '../services/recommendationsService';
import { format } from 'date-fns';

interface RecsStore {
  recs: PlanRec[];
  cachedDate: string | null;   // 'yyyy-MM-dd' — recs generated for this date
  isLoading: boolean;
  load: (weather: WeatherData) => Promise<void>;
  refresh: (weather: WeatherData) => Promise<void>;
}

export const useRecsStore = create<RecsStore>((set, get) => ({
  recs: [],
  cachedDate: null,
  isLoading: false,

  load: async (weather) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    // Skip if already loaded for today
    if (get().cachedDate === today && get().recs.length > 0) return;
    set({ isLoading: true });
    try {
      const recs = await generateDailyRecs(weather);
      set({ recs, cachedDate: today, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  refresh: async (weather) => {
    set({ isLoading: true, cachedDate: null });
    try {
      const recs = await generateDailyRecs(weather);
      const today = format(new Date(), 'yyyy-MM-dd');
      set({ recs, cachedDate: today, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
