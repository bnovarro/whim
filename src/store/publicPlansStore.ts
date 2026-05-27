import { create } from 'zustand';
import { format, addHours } from 'date-fns';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { PublicPlan, InterestedUser, ChatMessage } from '../types';

// ─── Seed data (used when Supabase isn't configured yet) ──────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const SEED_PLANS: PublicPlan[] = [
  {
    id: 'pp_1', creatorId: 'x1', creatorName: 'Riley Torres',
    creatorInstagram: 'rileytorres', creatorAvailabilityVisibility: 'public',
    planType: 'exclusive_date', visibility: 'public',
    activityType: 'drinks', barType: 'rooftop_bar',
    planName: 'Golden hour at Westlight',
    description: 'Looking for someone to share Williamsburg rooftop views. Easy conversation, good drinks.',
    neighborhood: 'Williamsburg', date: TODAY, timeStart: '7:00 PM',
    vibes: ['rooftop', 'outdoor', 'intimate'], groupSize: 2,
    attendeeCount: 1, maxAttendees: 2,
    interestedUsers: [{ userId: 'xi1', name: 'Alex M.', instagram: 'alexm', status: 'pending', requestedAt: addHours(new Date(), -0.5).toISOString() }],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -1).toISOString(),
  },
  {
    id: 'pp_2', creatorId: 'x2', creatorName: 'Maya Patel',
    creatorInstagram: 'mayapatel.nyc', creatorAvailabilityVisibility: 'friends',
    planType: 'group_hangout', visibility: 'public',
    activityType: 'dinner', cuisine: 'italian',
    planName: 'Dinner at Via Carota',
    description: 'West Village Italian, walk-in style. Looking for 2–3 more people with good energy.',
    neighborhood: 'West Village', date: TODAY, timeStart: '8:00 PM',
    vibes: ['intimate', 'classic', 'trendy'], groupSize: 4,
    attendeeCount: 2, maxAttendees: 4,
    interestedUsers: [{ userId: 'xi2', name: 'Jordan K.', instagram: 'jordank', status: 'accepted', requestedAt: addHours(new Date(), -2).toISOString() }],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -2).toISOString(),
  },
  {
    id: 'pp_3', creatorId: 'x3', creatorName: 'Ethan Moore',
    creatorAvailabilityVisibility: 'public',
    planType: 'open', visibility: 'public',
    activityType: 'activity',
    planName: 'High Line walk + drinks',
    description: "Walk from Gansevoort to 34th. Whoever's around, join at any point.",
    neighborhood: 'Chelsea', date: TODAY, timeStart: '5:30 PM',
    vibes: ['outdoor', 'casual', 'lively'], groupSize: 8,
    attendeeCount: 4, interestedUsers: [],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -3).toISOString(),
  },
  {
    id: 'pp_4', creatorId: 'x4', creatorName: 'Priya Kapoor',
    creatorInstagram: 'priyakapoor', creatorAvailabilityVisibility: 'public',
    planType: 'exclusive_date', visibility: 'public',
    activityType: 'coffee',
    planName: 'Sunday morning coffee',
    description: 'Trying Maman in Tribeca. Low-key, good conversation preferred.',
    neighborhood: 'Tribeca', date: TODAY, timeStart: '10:00 AM',
    vibes: ['casual', 'intimate'], groupSize: 2,
    attendeeCount: 1, maxAttendees: 2, interestedUsers: [],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -4).toISOString(),
  },
  {
    id: 'pp_5', creatorId: 'x5', creatorName: 'Jake Sullivan',
    creatorInstagram: 'jakesull', creatorAvailabilityVisibility: 'public',
    planType: 'group_hangout', visibility: 'public',
    activityType: 'drinks', barType: 'wine_bar',
    planName: 'Natural wine night at Wildair',
    description: 'Low-key natural wine bar in the LES. Great for meeting new people. 3-4 spots left.',
    neighborhood: 'Lower East Side', date: TODAY, timeStart: '9:00 PM',
    vibes: ['lively', 'trendy', 'intimate'], groupSize: 5,
    attendeeCount: 2, maxAttendees: 5,
    interestedUsers: [],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -1.5).toISOString(),
  },
  {
    id: 'pp_6', creatorId: 'x6', creatorName: 'Ava Chen',
    creatorInstagram: 'avachen__', creatorAvailabilityVisibility: 'public',
    planType: 'group_hangout', visibility: 'public',
    activityType: 'whatever',
    planName: 'Brunch at Balthazar',
    description: 'Sunday Balthazar run — eggs benedict and unlimited mimosas. Need 2 more.',
    neighborhood: 'SoHo', date: TODAY, timeStart: '11:30 AM',
    vibes: ['classic', 'lively', 'casual'], groupSize: 4,
    attendeeCount: 2, maxAttendees: 4,
    interestedUsers: [{ userId: 'xi6', name: 'Sam R.', status: 'accepted', requestedAt: addHours(new Date(), -0.5).toISOString() }],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -5).toISOString(),
  },
  {
    id: 'pp_7', creatorId: 'x7', creatorName: 'Marcus Webb',
    creatorAvailabilityVisibility: 'public',
    planType: 'open', visibility: 'public',
    activityType: 'sports',
    planName: 'Pickup basketball — Pier 2',
    description: 'Pier 2 courts at Brooklyn Bridge Park. All levels welcome. Just show up.',
    neighborhood: 'DUMBO', date: TODAY, timeStart: '4:00 PM',
    vibes: ['outdoor', 'casual', 'lively'], groupSize: 10,
    attendeeCount: 6, interestedUsers: [],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -3).toISOString(),
  },
  {
    id: 'pp_8', creatorId: 'x8', creatorName: 'Sofia Reyes',
    creatorInstagram: 'sofia.reyes.nyc', creatorAvailabilityVisibility: 'public',
    planType: 'exclusive_date', visibility: 'public',
    activityType: 'activity',
    planName: 'Brooklyn Flea + lunch after',
    description: 'Morning at the flea market then grab food nearby. Relaxed, no pressure.',
    neighborhood: 'DUMBO', date: TODAY, timeStart: '10:30 AM',
    vibes: ['outdoor', 'casual', 'intimate'], groupSize: 2,
    attendeeCount: 1, maxAttendees: 2,
    interestedUsers: [],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -2).toISOString(),
  },
  {
    id: 'pp_9', creatorId: 'x9', creatorName: 'Lily Park',
    creatorInstagram: 'lilypark.nyc', creatorAvailabilityVisibility: 'public',
    planType: 'exclusive_date', visibility: 'public',
    activityType: 'coffee',
    planName: 'Coffee at Partners',
    description: 'Just moved to the city. Would love to meet someone interesting over a good flat white.',
    neighborhood: 'West Village', date: TODAY, timeStart: '2:00 PM',
    vibes: ['casual', 'intimate'], groupSize: 2,
    attendeeCount: 1, maxAttendees: 2,
    interestedUsers: [],
    isJoined: false, hasExpressedInterest: false,
    createdAt: addHours(new Date(), -0.75).toISOString(),
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicPlansState {
  plans:     PublicPlan[];
  chats:     Record<string, ChatMessage[]>; // key: `${planId}_${otherUserId}`
  isLoading: boolean;

  fetchPlans:        (currentUserId: string)                                                  => Promise<void>;
  postPlan:          (plan: Omit<PublicPlan, 'id' | 'attendeeCount' | 'isJoined' | 'hasExpressedInterest' | 'interestedUsers' | 'createdAt'>) => Promise<void>;
  expressInterest:   (planId: string, currentUserId: string, name: string, instagram?: string) => Promise<void>;
  withdrawInterest:  (planId: string, userId: string)                                         => Promise<void>;
  userDeclinePlan:   (planId: string, userId: string, name: string, instagram?: string)       => Promise<void>;
  acceptInterest:    (planId: string, userId: string)                                         => Promise<void>;
  declineInterest:   (planId: string, userId: string)                                         => Promise<void>;
  joinPlan:          (planId: string, userId: string, name: string, instagram?: string)       => Promise<void>;
  leavePlan:         (planId: string, userId: string)                                         => Promise<void>;
  fetchMessages:     (planId: string, otherUserId: string)                                    => Promise<void>;
  sendMessage:       (planId: string, toUserId: string, senderId: string, senderName: string, text: string) => Promise<void>;
}

// ─── DB → App mapping ─────────────────────────────────────────────────────────

function rowToPlan(row: any, currentUserId: string): PublicPlan {
  // With RLS:
  //   creator  → sees ALL interests on their plan
  //   other    → sees ONLY their own interest row (if any)
  const interests: InterestedUser[] = (row.interests ?? []).map((i: any) => ({
    userId:      i.user_id,
    name:        i.name,
    instagram:   i.instagram ?? undefined,
    status:      i.status as InterestedUser['status'],
    requestedAt: i.requested_at,
    matchedAt:   i.matched_at ?? undefined,
  }));

  const myInterest           = interests.find(i => i.userId === currentUserId);
  // hasExpressedInterest = pending or accepted (NOT user_declined, which is a "no")
  const hasExpressedInterest = !!myInterest && myInterest.status !== 'user_declined';
  const isJoined             = myInterest?.status === 'accepted';

  return {
    id:                           row.id,
    creatorId:                    row.creator_id,
    creatorName:                  row.creator_name,
    creatorInstagram:             row.creator_instagram ?? undefined,
    creatorPhoto:                 row.creator_photo ?? undefined,
    creatorAvailabilityVisibility: row.creator_profile?.availability_visibility ?? 'private',
    planType:                     row.plan_type,
    visibility:                   row.visibility,
    activityType:                 row.activity_type,
    cuisine:                      row.cuisine ?? undefined,
    barType:                      row.bar_type ?? undefined,
    planName:                     row.plan_name,
    description:                  row.description ?? undefined,
    neighborhood:                 row.neighborhood,
    date:                         row.date,
    timeStart:                    row.time_start,
    vibes:                        row.vibes ?? [],
    groupSize:                    row.group_size,
    // attendee_count is maintained by DB trigger — source of truth for public count
    attendeeCount:                row.attendee_count ?? 1,
    maxAttendees:                 row.max_attendees ?? undefined,
    interestedUsers:              interests,
    isJoined,
    hasExpressedInterest,
    createdAt:                    row.created_at,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const usePublicPlansStore = create<PublicPlansState>((set, get) => ({
  // Start with seed plans so the UI looks alive before any fetch
  plans:     SUPABASE_CONFIGURED ? [] : SEED_PLANS,
  chats:     {},
  isLoading: false,

  // ── Fetch + realtime ──────────────────────────────────────────────────────
  fetchPlans: async (currentUserId) => {
    // In mock mode the seed plans are already loaded — nothing to fetch
    if (!SUPABASE_CONFIGURED) return;

    set({ isLoading: true });

    const { data, error } = await supabase
      .from('public_plans')
      .select(`
        *,
        interests (
          user_id, name, instagram, status, requested_at, matched_at
        ),
        creator_profile:profiles!creator_id (
          availability_visibility
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const plans = data.map(row => rowToPlan(row, currentUserId));
      set({ plans, isLoading: false });
    } else {
      set({ isLoading: false });
    }

    // Tear down any existing subscription before creating a new one
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    // Re-fetch whenever any plan or interest changes
    realtimeChannel = supabase
      .channel('whim-plans-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_plans' }, () => {
        get().fetchPlans(currentUserId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interests' }, () => {
        get().fetchPlans(currentUserId);
      })
      .subscribe();
  },

  // ── Post a new plan ───────────────────────────────────────────────────────
  postPlan: async (plan) => {
    if (!SUPABASE_CONFIGURED) {
      // Mock: prepend to local state
      const newPlan: PublicPlan = {
        ...plan,
        id:                  `pp_local_${Date.now()}`,
        attendeeCount:       1,
        isJoined:            true,
        hasExpressedInterest: false,
        interestedUsers:     [],
        createdAt:           new Date().toISOString(),
      };
      set(state => ({ plans: [newPlan, ...state.plans] }));
      return;
    }

    const { error } = await supabase.from('public_plans').insert({
      creator_id:        plan.creatorId,
      creator_name:      plan.creatorName,
      creator_instagram: plan.creatorInstagram ?? null,
      creator_photo:     plan.creatorPhoto ?? null,
      plan_type:         plan.planType,
      visibility:        plan.visibility,
      activity_type:     plan.activityType,
      cuisine:           plan.cuisine ?? null,
      bar_type:          plan.barType ?? null,
      plan_name:         plan.planName,
      description:       plan.description ?? null,
      neighborhood:      plan.neighborhood,
      date:              plan.date,
      time_start:        plan.timeStart,
      vibes:             plan.vibes,
      group_size:        plan.groupSize,
      max_attendees:     plan.maxAttendees ?? null,
    });

    if (error) throw new Error(error.message);
    // Realtime subscription will trigger fetchPlans automatically
  },

  // ── Interest actions ──────────────────────────────────────────────────────

  // Upsert so a user who previously declined can still express interest
  expressInterest: async (planId, currentUserId, name, instagram) => {
    if (!SUPABASE_CONFIGURED) {
      const interested: InterestedUser = { userId: currentUserId, name, instagram, status: 'pending', requestedAt: new Date().toISOString() };
      set(state => ({ plans: state.plans.map(p => p.id === planId ? { ...p, hasExpressedInterest: true, interestedUsers: [...p.interestedUsers.filter(u => u.userId !== currentUserId), interested] } : p) }));
      return;
    }
    const { error } = await supabase.from('interests').upsert({
      plan_id:      planId,
      user_id:      currentUserId,
      name,
      instagram:    instagram ?? null,
      status:       'pending',
      requested_at: new Date().toISOString(),
    }, { onConflict: 'plan_id,user_id' });
    if (error) throw new Error(error.message);
  },

  withdrawInterest: async (planId, userId) => {
    if (!SUPABASE_CONFIGURED) {
      set(state => ({
        plans: state.plans.map(p =>
          p.id === planId
            ? { ...p, hasExpressedInterest: false, interestedUsers: p.interestedUsers.filter(u => u.userId !== userId) }
            : p
        ),
      }));
      return;
    }
    const { error } = await supabase
      .from('interests')
      .delete()
      .eq('plan_id', planId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  // User explicitly says "not available" — stored as user_declined, only creator sees it
  userDeclinePlan: async (planId, userId, name, instagram) => {
    if (!SUPABASE_CONFIGURED) {
      const declined: InterestedUser = { userId, name, instagram, status: 'user_declined', requestedAt: new Date().toISOString() };
      set(state => ({
        plans: state.plans.map(p =>
          p.id === planId
            ? { ...p, hasExpressedInterest: false, interestedUsers: [...p.interestedUsers.filter(u => u.userId !== userId), declined] }
            : p
        ),
      }));
      return;
    }
    const { error } = await supabase.from('interests').upsert({
      plan_id:   planId,
      user_id:   userId,
      name,
      instagram: instagram ?? null,
      status:    'user_declined',
    }, { onConflict: 'plan_id,user_id' });
    if (error) throw new Error(error.message);
  },

  acceptInterest: async (planId, userId) => {
    if (!SUPABASE_CONFIGURED) {
      set(state => ({
        plans: state.plans.map(p =>
          p.id === planId
            ? {
                ...p,
                attendeeCount: p.attendeeCount + 1,
                interestedUsers: p.interestedUsers.map(u =>
                  u.userId === userId ? { ...u, status: 'accepted' as const } : u
                ),
              }
            : p
        ),
      }));
      return;
    }
    const { error } = await supabase
      .from('interests')
      .update({ status: 'accepted', matched_at: new Date().toISOString() })
      .eq('plan_id', planId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  declineInterest: async (planId, userId) => {
    if (!SUPABASE_CONFIGURED) {
      set(state => ({
        plans: state.plans.map(p =>
          p.id === planId
            ? { ...p, interestedUsers: p.interestedUsers.map(u => u.userId === userId ? { ...u, status: 'declined' as const } : u) }
            : p
        ),
      }));
      return;
    }
    const { error } = await supabase
      .from('interests')
      .update({ status: 'declined' })
      .eq('plan_id', planId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  // ── Join / leave (open plans — auto-accepted) ─────────────────────────────
  joinPlan: async (planId, userId, name, instagram) => {
    if (!SUPABASE_CONFIGURED) {
      const joined: InterestedUser = { userId, name, instagram, status: 'accepted', requestedAt: new Date().toISOString() };
      set(state => ({
        plans: state.plans.map(p =>
          p.id === planId
            ? {
                ...p,
                isJoined: true,
                attendeeCount: p.attendeeCount + 1,
                interestedUsers: [...p.interestedUsers.filter(u => u.userId !== userId), joined],
              }
            : p
        ),
      }));
      return;
    }
    const { error } = await supabase.from('interests').upsert({
      plan_id:    planId,
      user_id:    userId,
      name,
      instagram:  instagram ?? null,
      status:     'accepted',
      matched_at: new Date().toISOString(),
    }, { onConflict: 'plan_id,user_id' });
    if (error) throw new Error(error.message);
  },

  leavePlan: async (planId, userId) => {
    if (!SUPABASE_CONFIGURED) {
      set(state => ({
        plans: state.plans.map(p =>
          p.id === planId
            ? {
                ...p,
                isJoined: false,
                attendeeCount: Math.max(1, p.attendeeCount - 1),
                interestedUsers: p.interestedUsers.filter(u => u.userId !== userId),
              }
            : p
        ),
      }));
      return;
    }
    const { error } = await supabase
      .from('interests')
      .delete()
      .eq('plan_id', planId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  // ── Messaging ─────────────────────────────────────────────────────────────
  fetchMessages: async (planId, otherUserId) => {
    const key = `${planId}_${otherUserId}`;
    if (!SUPABASE_CONFIGURED) {
      // Mock: return whatever's already in local state (or empty)
      set(state => ({ chats: { [key]: state.chats[key] ?? [], ...state.chats } }));
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('plan_id', planId)
      .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
      .order('timestamp', { ascending: true });

    if (!error && data) {
      const msgs: ChatMessage[] = data.map(m => ({
        id:         m.id,
        senderId:   m.sender_id,
        senderName: m.sender_name ?? '',
        text:       m.text,
        timestamp:  m.timestamp,
      }));
      set(state => ({ chats: { ...state.chats, [key]: msgs } }));
    }
  },

  sendMessage: async (planId, toUserId, senderId, senderName, text) => {
    const key = `${planId}_${toUserId}`;
    if (!SUPABASE_CONFIGURED) {
      const newMsg: ChatMessage = {
        id:         `mock_msg_${Date.now()}`,
        senderId,
        senderName,
        text,
        timestamp:  new Date().toISOString(),
      };
      set(state => ({
        chats: { ...state.chats, [key]: [...(state.chats[key] ?? []), newMsg] },
      }));
      return;
    }

    const msg = {
      plan_id:     planId,
      sender_id:   senderId,
      receiver_id: toUserId,
      sender_name: senderName,
      text,
    };

    const { data, error } = await supabase.from('messages').insert(msg).select().single();
    if (error) throw new Error(error.message);

    const newMsg: ChatMessage = {
      id:         data.id,
      senderId:   data.sender_id,
      senderName: senderName,
      text:       data.text,
      timestamp:  data.timestamp,
    };

    set(state => ({
      chats: {
        ...state.chats,
        [key]: [...(state.chats[key] ?? []), newMsg],
      },
    }));
  },
}));
