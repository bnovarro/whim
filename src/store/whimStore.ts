import { create } from 'zustand';
import { Whim, WhimParams, Venue, Attendee, WhimStatus, WeatherData } from '../types';
import { generateVenuesWithAI, generateWhimSuggestion } from '../services/aiAgentService';
import { fetchSportsEvents } from '../services/sportsService';
import { fetchWeather } from '../services/weatherService';

function generateShareLink(id: string): string {
  return `https://whim.app/join/${id}`;
}

function generateId(): string {
  return `whim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface WhimStore {
  whims: Whim[];
  activeWhimId: string | null;
  searchingMessage: string;
  isSearching: boolean;

  createWhim: (params: WhimParams, creatorId: string, creatorName: string) => Promise<string>;
  launchSearch: (whimId: string, lat: number, lon: number, weather?: WeatherData | null) => Promise<void>;
  inviteFriend: (whimId: string, userId: string, name: string) => void;
  confirmAttendance: (whimId: string, userId: string) => void;
  declineWhim: (whimId: string, userId: string) => void;
  selectVenue: (whimId: string, venueId: string) => void;
  cancelWhim: (whimId: string) => void;
  getWhimById: (id: string) => Whim | undefined;
  setActiveWhim: (id: string | null) => void;
}

const DEMO_WHIMS: Whim[] = [
  {
    id: 'demo1',
    creatorId: 'u1',
    creatorName: 'Alex Chen',
    params: {
      activityType: 'drinks',
      timeStart: '7:00 PM',
      timeEnd: '10:00 PM',
      radiusMiles: 1.5,
      vibes: ['rooftop', 'outdoor'],
      groupSize: 4,
    },
    status: 'found',
    attendees: [
      { userId: 'u1', name: 'Alex Chen', status: 'confirmed' },
      { userId: 'u2', name: 'Jordan Kim', status: 'confirmed' },
      { userId: 'u3', name: 'Sam Rivera', status: 'invited' },
    ],
    venues: [],
    shareLink: 'https://whim.app/join/demo1',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useWhimStore = create<WhimStore>((set, get) => ({
  whims: DEMO_WHIMS,
  activeWhimId: null,
  searchingMessage: '',
  isSearching: false,

  createWhim: async (params, creatorId, creatorName) => {
    const id = generateId();
    const whim: Whim = {
      id,
      creatorId,
      creatorName,
      params,
      status: 'drafting',
      attendees: [{ userId: creatorId, name: creatorName, status: 'confirmed' }],
      venues: [],
      shareLink: generateShareLink(id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ whims: [whim, ...state.whims], activeWhimId: id }));
    return id;
  },

  launchSearch: async (whimId, lat, lon, weather) => {
    const whim = get().getWhimById(whimId);
    if (!whim) return;

    set({ isSearching: true, searchingMessage: 'Scanning the city...' });

    // Update status to searching
    set(state => ({
      whims: state.whims.map(w =>
        w.id === whimId ? { ...w, status: 'searching' as WhimStatus, updatedAt: new Date().toISOString() } : w
      ),
    }));

    try {
      // Fetch live weather if not passed in (used to improve both the search message and venue ranking)
      let liveWeather = weather ?? null;
      if (!liveWeather) {
        try { liveWeather = await fetchWeather(lat, lon); } catch { /* non-fatal */ }
      }

      const [searchMsg, rankedVenues] = await Promise.all([
        generateWhimSuggestion(whim.params, liveWeather),
        generateVenuesWithAI(whim.params, liveWeather),
      ]);

      set({ searchingMessage: searchMsg });
      await new Promise(r => setTimeout(r, 800));

      let sportsEvents = undefined;
      if (whim.params.activityType === 'sports') {
        sportsEvents = await fetchSportsEvents(lat, lon, whim.params.radiusMiles);
      }

      set(state => ({
        whims: state.whims.map(w =>
          w.id === whimId ? { ...w, status: 'found' as WhimStatus, venues: rankedVenues, sportsEvents, updatedAt: new Date().toISOString() } : w
        ),
        isSearching: false,
        searchingMessage: '',
      }));
    } catch {
      set({ isSearching: false, searchingMessage: '' });
    }
  },

  inviteFriend: (whimId, userId, name) => {
    set(state => ({
      whims: state.whims.map(w => {
        if (w.id !== whimId) return w;
        const alreadyIn = w.attendees.some(a => a.userId === userId);
        if (alreadyIn) return w;
        const newAttendee: Attendee = { userId, name, status: 'invited' };
        return { ...w, attendees: [...w.attendees, newAttendee], updatedAt: new Date().toISOString() };
      }),
    }));
  },

  confirmAttendance: (whimId, userId) => {
    set(state => ({
      whims: state.whims.map(w =>
        w.id !== whimId ? w : {
          ...w,
          attendees: w.attendees.map(a => a.userId === userId ? { ...a, status: 'confirmed' as const } : a),
          updatedAt: new Date().toISOString(),
        }
      ),
    }));
  },

  declineWhim: (whimId, userId) => {
    set(state => ({
      whims: state.whims.map(w =>
        w.id !== whimId ? w : {
          ...w,
          attendees: w.attendees.map(a => a.userId === userId ? { ...a, status: 'declined' as const } : a),
          updatedAt: new Date().toISOString(),
        }
      ),
    }));
  },

  selectVenue: (whimId, venueId) => {
    set(state => ({
      whims: state.whims.map(w =>
        w.id !== whimId ? w : { ...w, selectedVenueId: venueId, status: 'confirmed', updatedAt: new Date().toISOString() }
      ),
    }));
  },

  cancelWhim: (whimId) => {
    set(state => ({
      whims: state.whims.map(w =>
        w.id !== whimId ? w : { ...w, status: 'cancelled', updatedAt: new Date().toISOString() }
      ),
    }));
  },

  getWhimById: (id) => get().whims.find(w => w.id === id),

  setActiveWhim: (id) => set({ activeWhimId: id }),
}));
