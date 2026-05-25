import { create } from 'zustand';
import { FlightDeal, TripItinerary } from '../types';
import { fetchFlightDeals } from '../services/flightService';
import { generateItinerary } from '../services/aiAgentService';

interface EscapeStore {
  deals: FlightDeal[];
  selectedDealId: string | null;
  isLoading: boolean;
  isGeneratingItinerary: boolean;
  generatedItineraries: Record<string, TripItinerary>;
  filters: { maxDays: number | null; domestic: boolean | null };

  loadDeals: () => Promise<void>;
  selectDeal: (id: string) => void;
  loadItinerary: (dealId: string) => Promise<void>;
  setFilters: (filters: Partial<EscapeStore['filters']>) => void;
  getFilteredDeals: () => FlightDeal[];
}

export const useEscapeStore = create<EscapeStore>((set, get) => ({
  deals: [],
  selectedDealId: null,
  isLoading: false,
  isGeneratingItinerary: false,
  generatedItineraries: {},
  filters: { maxDays: null, domestic: null },

  loadDeals: async () => {
    if (get().deals.length > 0) return;
    set({ isLoading: true });
    try {
      const deals = await fetchFlightDeals('JFK');
      set({ deals, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectDeal: (id) => set({ selectedDealId: id }),

  loadItinerary: async (dealId) => {
    const existing = get().generatedItineraries[dealId];
    if (existing) return;

    const deal = get().deals.find(d => d.id === dealId);
    if (!deal) return;

    if (deal.itinerary) {
      set(state => ({
        generatedItineraries: { ...state.generatedItineraries, [dealId]: deal.itinerary! },
      }));
      return;
    }

    set({ isGeneratingItinerary: true });
    try {
      const itinerary = await generateItinerary(deal);
      set(state => ({
        generatedItineraries: { ...state.generatedItineraries, [dealId]: itinerary },
        isGeneratingItinerary: false,
      }));
    } catch {
      set({ isGeneratingItinerary: false });
    }
  },

  setFilters: (filters) => {
    set(state => ({ filters: { ...state.filters, ...filters } }));
  },

  getFilteredDeals: () => {
    const { deals, filters } = get();
    return deals.filter(d => {
      if (filters.maxDays !== null && d.tripLength.max > filters.maxDays) return false;
      if (filters.domestic !== null) {
        const isDomestic = d.destination.country === 'USA';
        if (filters.domestic !== isDomestic) return false;
      }
      return true;
    });
  },
}));
