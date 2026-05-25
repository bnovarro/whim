import { create } from 'zustand';
import { AvailabilityVisibility, DayAvailability } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FriendData {
  id: string;
  name: string;
  photo?: string;
  /** up to 6 gallery photos */
  photos?: string[];
  instagram?: string;
  bio?: string;
  availabilityVisibility: AvailabilityVisibility;
  /**
   * Index 0 = today, 1 = tomorrow, …, 6 = 6 days from now.
   * 'unknown' when availability is private or not yet synced.
   */
  weekAvailability: DayAvailability[];
}

interface FriendsState {
  friends: FriendData[];
  /** UserIds we've sent a friend request to (mock — persists per session) */
  sentRequests: string[];
  sendFriendRequest: (userId: string) => void;
}

// ─── Mock friends ─────────────────────────────────────────────────────────────

const MOCK_FRIENDS: FriendData[] = [
  {
    id: 'f_alex',
    name: 'Alex Kim',
    instagram: 'alexkim.nyc',
    bio: 'Always down for rooftops, ramen, and spontaneous plans. Former Seoulite, current Brooklynite.',
    availabilityVisibility: 'public',
    weekAvailability: ['free', 'busy', 'free', 'free', 'busy', 'free', 'free'],
  },
  {
    id: 'f_sophia',
    name: 'Sophia Chen',
    instagram: 'sophiachen',
    bio: 'Photographer & coffee obsessive. Shooting the city one espresso at a time.',
    availabilityVisibility: 'public',
    weekAvailability: ['busy', 'free', 'free', 'busy', 'free', 'free', 'busy'],
  },
  {
    id: 'f_marcus',
    name: 'Marcus Williams',
    bio: 'Chelsea → Williamsburg → wherever the night takes us.',
    availabilityVisibility: 'friends',
    weekAvailability: ['free', 'free', 'busy', 'free', 'free', 'busy', 'free'],
  },
  {
    id: 'f_nina',
    name: 'Nina Patel',
    instagram: 'ninapatel.nyc',
    bio: 'Yoga in the morning, good food at night. Perpetual explorer.',
    availabilityVisibility: 'public',
    weekAvailability: ['unknown', 'free', 'free', 'free', 'busy', 'free', 'free'],
  },
  {
    id: 'f_jake',
    name: 'Jake Morrison',
    availabilityVisibility: 'private',
    weekAvailability: ['unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'],
  },
  {
    id: 'f_olivia',
    name: 'Olivia Park',
    instagram: 'oliviapark.nyc',
    bio: 'Brunch weekends and random weeknight adventures. Film dev by day.',
    availabilityVisibility: 'public',
    weekAvailability: ['free', 'free', 'free', 'busy', 'free', 'free', 'busy'],
  },
  {
    id: 'f_devon',
    name: 'Devon Chang',
    bio: 'New to NYC. Genuinely down for literally anything. Show me everything.',
    availabilityVisibility: 'friends',
    weekAvailability: ['busy', 'busy', 'free', 'free', 'free', 'busy', 'free'],
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFriendsStore = create<FriendsState>((set) => ({
  friends: MOCK_FRIENDS,
  sentRequests: [],
  sendFriendRequest: (userId) =>
    set(s => ({ sentRequests: s.sentRequests.includes(userId) ? s.sentRequests : [...s.sentRequests, userId] })),
}));
