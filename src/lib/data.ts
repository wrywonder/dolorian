/**
 * Single data-access interface. All screens import from here.
 *
 * Phase 7: live Supabase queries. Every method is async. RLS handles
 * most visibility filtering — the current user's parent_id is resolved
 * from the auth session and cached per sign-in.
 */

import { supabase } from '@/lib/supabase';
import type {
  Activity,
  ActivityInteraction,
  ActivitySocialProof,
  CalendarEvent,
  Connection,
  ConnectionStatus,
  FeedItem,
  InteractionState,
  Kid,
  NearbyParent,
  Parent,
  Post,
  ProfileView,
  Prompt,
  PromptType,
  ResolvedPrompt,
  UUID,
  Venue,
} from '@/types';

// ─────── current user identity (cached) ───────

let _cachedParentId: UUID | null = null;

async function getCurrentParentId(): Promise<UUID> {
  if (_cachedParentId) return _cachedParentId;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('parents')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (error || !data) throw new Error('Parent profile not found');
  _cachedParentId = data.id as UUID;
  return _cachedParentId!;
}

supabase.auth.onAuthStateChange(() => { _cachedParentId = null; });

// ─────── current user ───────

async function getCurrentUser(): Promise<Parent> {
  const id = await getCurrentParentId();
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Current user not found');
  return data as Parent;
}

// ─────── feed (Buzz tab) ───────

async function getFeedPosts(): Promise<FeedItem[]> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, author:parents!author_id(*), activity:activities(*), venue:venues(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (posts ?? []).map((row: Record<string, unknown>) => ({
    post: extractPost(row),
    author: row.author as Parent,
    activity: (row.activity as Activity) ?? null,
    venue: (row.venue as Venue) ?? null,
  }));
}

function extractPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as string,
    author_id: row.author_id as string,
    type: row.type as Post['type'],
    body: (row.body as string) ?? null,
    media_path: (row.media_path as string) ?? null,
    activity_id: (row.activity_id as string) ?? null,
    story_id: (row.story_id as string) ?? null,
    location_share_mode: row.location_share_mode as Post['location_share_mode'],
    venue_id: (row.venue_id as string) ?? null,
    created_at: row.created_at as string,
  };
}

// ─────── prompts (Buzz prompt card slot) ───────

async function getPendingPrompt(): Promise<ResolvedPrompt | null> {
  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('state', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !prompts || prompts.length === 0) return null;

  const prompt = prompts[0] as Prompt;
  return resolvePrompt(prompt);
}

async function resolvePrompt<T extends PromptType>(prompt: Prompt<T>): Promise<ResolvedPrompt<T>> {
  const payload = prompt.payload as Record<string, unknown>;
  const activityId = payload.activity_id as string | undefined;

  let activity: Activity | null = null;
  let venue: Venue | null = null;
  let signalFrom: Parent | null = null;

  if (activityId) {
    const { data } = await supabase.from('activities').select('*').eq('id', activityId).single();
    activity = (data as Activity) ?? null;
    if (activity?.venue_id) {
      const { data: v } = await supabase.from('venues').select('*').eq('id', activity.venue_id).single();
      venue = (v as Venue) ?? null;
    }
  }

  if (prompt.prompt_type === 'rsvp_from_friend_signal') {
    const signalId = payload.signal_from as string | undefined;
    if (signalId) {
      const { data } = await supabase.from('parents').select('*').eq('id', signalId).single();
      signalFrom = (data as Parent) ?? null;
    }
  }

  return { prompt, activity, venue, signalFrom };
}

async function markPromptActed(promptId: UUID): Promise<void> {
  await supabase.from('prompts').update({ state: 'acted' }).eq('id', promptId);
}

async function dismissPrompt(promptId: UUID): Promise<void> {
  await supabase.from('prompts').update({ state: 'dismissed' }).eq('id', promptId);
}

// ─────── activities (Plans tab) ───────

async function getUpcomingActivities(): Promise<ActivitySocialProof[]> {
  const me = await getCurrentParentId();

  const { data: activities, error } = await supabase
    .from('activities')
    .select('*, venue:venues(*)')
    .eq('published', true)
    .order('starts_at', { ascending: true });
  if (error || !activities) return [];

  const activityIds = activities.map((a: Record<string, unknown>) => a.id as string);
  if (activityIds.length === 0) return [];

  const { data: interactions } = await supabase
    .from('activity_interactions')
    .select('*, parent:parents(*)')
    .in('activity_id', activityIds);

  return activities.map((row: Record<string, unknown>) =>
    buildSocialProof(row, interactions ?? [], me),
  );
}

async function getDiscoveredActivityPreviews(): Promise<ActivitySocialProof[]> {
  const me = await getCurrentParentId();

  const { data: activities, error } = await supabase
    .from('activities')
    .select('*, venue:venues(*)')
    .eq('published', false)
    .eq('source', 'ai_discovered');
  if (error || !activities) return [];

  const activityIds = activities.map((a: Record<string, unknown>) => a.id as string);
  if (activityIds.length === 0) return [];

  const { data: interactions } = await supabase
    .from('activity_interactions')
    .select('*, parent:parents(*)')
    .in('activity_id', activityIds);

  return activities.map((row: Record<string, unknown>) =>
    buildSocialProof(row, interactions ?? [], me),
  );
}

function buildSocialProof(
  row: Record<string, unknown>,
  allInteractions: Record<string, unknown>[],
  me: UUID,
): ActivitySocialProof {
  const activity: Activity = {
    id: row.id as string,
    name: row.name as string,
    emoji: (row.emoji as string) ?? null,
    description: (row.description as string) ?? null,
    venue_id: (row.venue_id as string) ?? null,
    starts_at: (row.starts_at as string) ?? null,
    ends_at: (row.ends_at as string) ?? null,
    source: row.source as Activity['source'],
    source_metadata: (row.source_metadata as Record<string, unknown>) ?? {},
    confidence_score: (row.confidence_score as number) ?? null,
    created_by: (row.created_by as string) ?? null,
    published: row.published as boolean,
    created_at: row.created_at as string,
  };
  const venue = (row.venue as Venue) ?? null;

  const rows = allInteractions.filter(
    (i) => (i.activity_id as string) === activity.id,
  );

  const interestedConnections: Parent[] = [];
  const goingConnections: Parent[] = [];
  let myState: InteractionState | null = null;

  for (const i of rows) {
    const parentId = i.parent_id as string;
    const state = i.state as InteractionState;
    if (parentId === me) {
      myState = state;
      continue;
    }
    const parent = i.parent as Parent | null;
    if (!parent) continue;
    if (state === 'interested') interestedConnections.push(parent);
    else if (state === 'going' || state === 'attended') goingConnections.push(parent);
  }

  return { activity, venue, interestedConnections, goingConnections, myState };
}

async function updateActivityInteraction(
  activityId: UUID,
  state: InteractionState,
): Promise<ActivityInteraction> {
  const me = await getCurrentParentId();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('activity_interactions')
    .upsert(
      { parent_id: me, activity_id: activityId, state, state_changed_at: now, created_at: now },
      { onConflict: 'parent_id,activity_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as ActivityInteraction;
}

// ─────── nearby (IRL tab) ───────

async function getNearbyParents(): Promise<NearbyParent[]> {
  const { data, error } = await supabase
    .from('parent_locations')
    .select('*, parent:parents(*), venue:venues(*)')
    .eq('visible', true);
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    parent: row.parent as Parent,
    location: {
      id: row.id as string,
      parent_id: row.parent_id as string,
      venue_id: (row.venue_id as string) ?? null,
      visible: row.visible as boolean,
      last_seen_at: row.last_seen_at as string,
      expires_at: (row.expires_at as string) ?? null,
    },
    venue: (row.venue as Venue) ?? null,
  }));
}

async function getVisibleConnectionAvatars(): Promise<Parent[]> {
  const me = await getCurrentParentId();
  const { data, error } = await supabase
    .from('parent_locations')
    .select('parent:parents(*)')
    .eq('visible', true)
    .neq('parent_id', me);
  if (error || !data) return [];
  return data
    .map((row: Record<string, unknown>) => row.parent as Parent | null)
    .filter((p): p is Parent => p !== null);
}

async function getWarmingUpVenues(): Promise<{ venue: Venue; count: number }[]> {
  const me = await getCurrentParentId();

  // Get all venues
  const { data: venues } = await supabase.from('venues').select('*');
  if (!venues) return [];

  // Count visible parents per venue (excluding self)
  const { data: locations } = await supabase
    .from('parent_locations')
    .select('venue_id')
    .eq('visible', true)
    .neq('parent_id', me);

  const counts = new Map<string, number>();
  for (const loc of locations ?? []) {
    const vid = (loc as Record<string, unknown>).venue_id as string | null;
    if (vid) counts.set(vid, (counts.get(vid) ?? 0) + 1);
  }

  return (venues as Venue[])
    .map((venue) => ({ venue, count: counts.get(venue.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

async function setMyVisibility(visible: boolean): Promise<void> {
  const me = await getCurrentParentId();
  const { data: existing } = await supabase
    .from('parent_locations')
    .select('id')
    .eq('parent_id', me)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('parent_locations')
      .update({ visible, last_seen_at: new Date().toISOString() })
      .eq('parent_id', me);
  } else {
    await supabase
      .from('parent_locations')
      .insert({ parent_id: me, visible, last_seen_at: new Date().toISOString() });
  }
}

// ─────── profile (You tab + profile/[id]) ───────

async function getProfile(parentId: UUID): Promise<ProfileView | null> {
  const me = await getCurrentParentId();

  const { data: parent } = await supabase
    .from('parents')
    .select('*')
    .eq('id', parentId)
    .single();
  if (!parent) return null;

  const { data: kids } = await supabase
    .from('kids')
    .select('*')
    .eq('parent_id', parentId);

  let connectionStatus: ConnectionStatus | 'none' = 'none';
  if (parentId !== me) {
    const [a, b] = me < parentId ? [me, parentId] : [parentId, me];
    const { data: conn } = await supabase
      .from('connections')
      .select('status')
      .eq('parent_a', a)
      .eq('parent_b', b)
      .maybeSingle();
    connectionStatus = (conn?.status as ConnectionStatus) ?? 'none';
  }

  // Mutual friends
  let mutualFriendCount = 0;
  if (parentId !== me) {
    const { data: myConns } = await supabase
      .from('connections')
      .select('parent_a, parent_b')
      .eq('status', 'connected');
    const myFriends = new Set<string>();
    for (const c of myConns ?? []) {
      const r = c as Record<string, unknown>;
      if (r.parent_a === me) myFriends.add(r.parent_b as string);
      else if (r.parent_b === me) myFriends.add(r.parent_a as string);
    }

    const { data: theirConns } = await supabase
      .from('connections')
      .select('parent_a, parent_b')
      .eq('status', 'connected');
    for (const c of theirConns ?? []) {
      const r = c as Record<string, unknown>;
      const other = r.parent_a === parentId ? (r.parent_b as string) : (r.parent_a as string);
      if (myFriends.has(other)) mutualFriendCount++;
    }
  }

  // Activity chips
  const { data: interactions } = await supabase
    .from('activity_interactions')
    .select('activity:activities(name, venue_id, venue:venues(name, emoji))')
    .eq('parent_id', parentId)
    .not('state', 'in', '("skipped","saved")');

  const venueNames = new Set<string>();
  for (const row of interactions ?? []) {
    const r = row as Record<string, unknown>;
    const act = r.activity as Record<string, unknown> | null;
    if (!act) continue;
    const v = act.venue as Record<string, unknown> | null;
    if (v) venueNames.add(`${(v.emoji as string) ?? ''} ${v.name as string}`.trim());
  }

  return {
    parent: parent as Parent,
    kids: (kids ?? []) as Kid[],
    connectionStatus,
    mutualFriendCount,
    activityChips: [...venueNames].slice(0, 4),
  };
}

// ─────── connections ───────

async function getConnections(): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections')
    .select('*');
  if (error) throw error;
  return (data ?? []) as Connection[];
}

async function requestConnection(otherId: UUID): Promise<Connection> {
  const me = await getCurrentParentId();
  if (otherId === me) throw new Error('Cannot connect to self');
  const [a, b] = me < otherId ? [me, otherId] : [otherId, me];

  const { data: existing } = await supabase
    .from('connections')
    .select('*')
    .eq('parent_a', a)
    .eq('parent_b', b)
    .maybeSingle();
  if (existing) return existing as Connection;

  const { data, error } = await supabase
    .from('connections')
    .insert({ parent_a: a, parent_b: b, status: 'pending', initiated_by: me })
    .select()
    .single();
  if (error) throw error;
  return data as Connection;
}

// ─────── calendar ───────

async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*');
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

// ─────── posts (compose) ───────

async function createPost(input: Omit<Post, 'id' | 'created_at'>): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Post;
}

// ─────── public interface ───────

export const data = {
  getCurrentUser,
  getFeedPosts,
  getPendingPrompt,
  markPromptActed,
  dismissPrompt,
  getUpcomingActivities,
  getDiscoveredActivityPreviews,
  updateActivityInteraction,
  getNearbyParents,
  getVisibleConnectionAvatars,
  getWarmingUpVenues,
  setMyVisibility,
  getProfile,
  getConnections,
  requestConnection,
  createPost,
  getCalendarEvents,
};
