import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'whim_notifications';

export type NotifType =
  | 'whim_created'
  | 'whim_reminder'
  | 'friend_free'
  | 'weather_good'
  | 'friend_joined'
  | 'plan_posted';

export interface AppNotification {
  id:        string;
  type:      NotifType;
  title:     string;
  body:      string;
  data?:     Record<string, string>;
  timestamp: string;
  read:      boolean;
}

interface NotificationsState {
  notifications: AppNotification[];

  load:       ()                                                              => Promise<void>;
  push:       (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>)       => Promise<void>;
  markRead:   (id: string)                                                   => Promise<void>;
  markAllRead: ()                                                            => Promise<void>;
  clear:      ()                                                             => Promise<void>;
  unreadCount: ()                                                            => number;
}

async function persist(notifs: AppNotification[]) {
  // Keep only the 50 most recent
  const trimmed = notifs.slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ notifications: JSON.parse(raw) });
    } catch { /* non-fatal */ }
  },

  push: async (n) => {
    const notif: AppNotification = {
      ...n,
      id:        `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read:      false,
    };
    const updated = [notif, ...get().notifications];
    set({ notifications: updated });
    await persist(updated);
  },

  markRead: async (id) => {
    const updated = get().notifications.map(n => n.id === id ? { ...n, read: true } : n);
    set({ notifications: updated });
    await persist(updated);
  },

  markAllRead: async () => {
    const updated = get().notifications.map(n => ({ ...n, read: true }));
    set({ notifications: updated });
    await persist(updated);
  },

  clear: async () => {
    set({ notifications: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));
