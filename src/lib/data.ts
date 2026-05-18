/**
 * Single data-access interface. All screens import from here.
 *
 * Phase 2: mock-backed. Phase 7: swaps internals to live Supabase queries
 * without changing any callsite. Every method is async even when the mock
 * impl is sync — that way the boundary is already correct.
 */

import {
  CURRENT_PARENT_ID,
  mockActivities,
  mockActivityInteractions,
  mockCalendarEvents,
  mockConnections,
  mockKids,
  mockParentLocations,
  mockParents,
  mockPosts,
  mockPrompts,
  mockVenues,
} from '@/mocks';
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

// ─────── internal helpers ───────

function parentById(id: UUID): Parent | null {
  return mockParents.find((p) => p.id === id) ?? null;
}

function venueById(id: UUID | null): Venue | null {
  if (!id) return null;
  return mockVenues.find((v) => v.id === id) ?? null;
}

function activityById(id: UUID | null): Activity | null {
  if (!id) return null;
  return mockActivities.find((a) => a.id === id) ?? null;
}

/** Connected-parent ids for the given user (status = 'connected' only). */
function connectedParentIds(userId: UUID): Set<UUID> {
  const ids = new Set<UUID>();
  for (const c of mockConnections) {
    if (c.status !== 'connected') continue;
    if (c.parent_a === userId) ids.add(c.parent_b);
    else if (c.parent_b === userId) ids.add(c.parent_a);
  }
  return ids;
}

// ─────── current user ───────

async function getCurrentUser(): Promise<Parent> {
  const me = parentById(CURRENT_PARENT_ID);
  if (!me) throw new Error('Current user not found in mocks');
  return me;
}

// ─────── feed (Buzz tab) ───────

/**
 * "Posts visible to me in the Buzz feed" — author is me OR a connected parent.
 * Returns newest first, with author/activity/venue eagerly joined.
 */
async function getFeedPosts(): Promise<FeedItem[]> {
  const me = CURRENT_PARENT_ID;
  const connected = connectedParentIds(me);

  return mockPosts
    .filter((p) => p.author_id === me || connected.has(p.author_id))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((post) => {
      const author = parentById(post.author_id);
      if (!author) throw new Error(`Post ${post.id} has unknown author`);
      return {
        post,
        author,
        activity: activityById(post.activity_id),
        venue: venueById(post.venue_id),
      };
    });
}

// ─────── prompts (Buzz prompt card slot) ───────

async function getPendingPrompt(): Promise<ResolvedPrompt | null> {
  const me = CURRENT_PARENT_ID;
  const pending = mockPrompts
    .filter((p) => p.parent_id === me && p.state === 'pending')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const prompt = pending[0];
  if (!prompt) return null;

  return resolvePrompt(prompt);
}

function resolvePrompt<T extends PromptType>(prompt: Prompt<T>): ResolvedPrompt<T> {
  // The payload type is narrowed by T, so we can read fields safely per branch.
  switch (prompt.prompt_type) {
    case 'share_after_activity': {
      const p = prompt as Prompt<'share_after_activity'>;
      const activity = activityById(p.payload.activity_id);
      return {
        prompt,
        activity,
        venue: venueById(activity?.venue_id ?? null),
      };
    }
    case 'rsvp_from_friend_signal': {
      const p = prompt as Prompt<'rsvp_from_friend_signal'>;
      const activity = activityById(p.payload.activity_id);
      return {
        prompt,
        activity,
        venue: venueById(activity?.venue_id ?? null),
        signalFrom: parentById(p.payload.signal_from),
      };
    }
    case 'confirm_calendar_import': {
      const p = prompt as Prompt<'confirm_calendar_import'>;
      const activity = activityById(p.payload.activity_id);
      return {
        prompt,
        activity,
        venue: venueById(activity?.venue_id ?? null),
      };
    }
    case 'finalize_weekend_story':
      return { prompt };
  }
}

async function markPromptActed(promptId: UUID): Promise<void> {
  const p = mockPrompts.find((x) => x.id === promptId);
  if (p) p.state = 'acted';
}

async function dismissPrompt(promptId: UUID): Promise<void> {
  const p = mockPrompts.find((x) => x.id === promptId);
  if (p) p.state = 'dismissed';
}

// ─────── activities (Plans tab) ───────

/**
 * "Activities this week, with my friends' interest + RSVP counts."
 * Returns published activities sorted by starts_at ascending, with
 * connected-parent interaction stacks split into interested vs going.
 */
async function getUpcomingActivities(): Promise<ActivitySocialProof[]> {
  const me = CURRENT_PARENT_ID;
  const connected = connectedParentIds(me);

  return mockActivities
    .filter((a) => a.published)
    .sort((a, b) => {
      if (!a.starts_at) return 1;
      if (!b.starts_at) return -1;
      return a.starts_at < b.starts_at ? -1 : 1;
    })
    .map((activity) => buildSocialProof(activity, connected, me));
}

/** AI-discovered activities awaiting user confirmation. */
async function getDiscoveredActivityPreviews(): Promise<ActivitySocialProof[]> {
  const me = CURRENT_PARENT_ID;
  const connected = connectedParentIds(me);
  return mockActivities
    .filter((a) => !a.published && a.source === 'ai_discovered')
    .map((activity) => buildSocialProof(activity, connected, me));
}

function buildSocialProof(
  activity: Activity,
  connectedIds: Set<UUID>,
  me: UUID,
): ActivitySocialProof {
  const rows = mockActivityInteractions.filter((i) => i.activity_id === activity.id);
  const interestedConnections: Parent[] = [];
  const goingConnections: Parent[] = [];
  let myState: InteractionState | null = null;

  for (const row of rows) {
    if (row.parent_id === me) {
      myState = row.state;
      continue;
    }
    if (!connectedIds.has(row.parent_id)) continue;
    const author = parentById(row.parent_id);
    if (!author) continue;
    if (row.state === 'interested') interestedConnections.push(author);
    else if (row.state === 'going' || row.state === 'attended') goingConnections.push(author);
  }

  return {
    activity,
    venue: venueById(activity.venue_id),
    interestedConnections,
    goingConnections,
    myState,
  };
}

async function updateActivityInteraction(
  activityId: UUID,
  state: InteractionState,
): Promise<ActivityInteraction> {
  const me = CURRENT_PARENT_ID;
  const existing = mockActivityInteractions.find(
    (i) => i.parent_id === me && i.activity_id === activityId,
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.state = state;
    existing.state_changed_at = now;
    return existing;
  }
  const inserted: ActivityInteraction = {
    id: `ai-${activityId}-${me}`,
    parent_id: me,
    activity_id: activityId,
    state,
    state_changed_at: now,
    created_at: now,
  };
  mockActivityInteractions.push(inserted);
  return inserted;
}

// ─────── nearby (IRL tab) ───────

/**
 * "Connected parents currently at a visible venue." Includes Drew's own row.
 */
async function getNearbyParents(): Promise<NearbyParent[]> {
  const me = CURRENT_PARENT_ID;
  const connected = connectedParentIds(me);
  return mockParentLocations
    .filter((l) => l.visible && (l.parent_id === me || connected.has(l.parent_id)))
    .map((location) => {
      const parent = parentById(location.parent_id);
      if (!parent) throw new Error(`Location ${location.id} has unknown parent`);
      return { parent, location, venue: venueById(location.venue_id) };
    });
}

/** Visible connected parents for the visibility chip avatar stack. */
async function getVisibleConnectionAvatars(): Promise<Parent[]> {
  const me = CURRENT_PARENT_ID;
  const connected = connectedParentIds(me);
  return mockParentLocations
    .filter((l) => l.visible && connected.has(l.parent_id))
    .map((l) => parentById(l.parent_id))
    .filter((p): p is Parent => p !== null);
}

/**
 * "Warming up" — venues with connected parents present, sorted by count.
 */
async function getWarmingUpVenues(): Promise<{ venue: Venue; count: number }[]> {
  const me = CURRENT_PARENT_ID;
  const connected = connectedParentIds(me);
  const counts = new Map<UUID, number>();
  for (const loc of mockParentLocations) {
    if (!loc.visible || !loc.venue_id) continue;
    if (loc.parent_id === me) continue;
    if (!connected.has(loc.parent_id)) continue;
    counts.set(loc.venue_id, (counts.get(loc.venue_id) ?? 0) + 1);
  }
  // Include venues with upcoming activities too — design shows Albany Aquatic
  // even when no one is currently there, since it's a known venue.
  for (const venue of mockVenues) {
    if (!counts.has(venue.id)) counts.set(venue.id, 0);
  }
  return [...counts.entries()]
    .map(([venueId, count]) => {
      const venue = venueById(venueId);
      return venue ? { venue, count } : null;
    })
    .filter((x): x is { venue: Venue; count: number } => x !== null)
    .sort((a, b) => b.count - a.count);
}

async function setMyVisibility(visible: boolean): Promise<void> {
  const me = CURRENT_PARENT_ID;
  const row = mockParentLocations.find((l) => l.parent_id === me);
  if (row) row.visible = visible;
}

// ─────── profile (You tab + profile/[id]) ───────

async function getProfile(parentId: UUID): Promise<ProfileView | null> {
  const parent = parentById(parentId);
  if (!parent) return null;
  const me = CURRENT_PARENT_ID;

  const kids = mockKids.filter((k) => k.parent_id === parentId);

  let connectionStatus: ConnectionStatus | 'none' = 'none';
  if (parentId !== me) {
    const conn = mockConnections.find(
      (c) =>
        (c.parent_a === me && c.parent_b === parentId) ||
        (c.parent_b === me && c.parent_a === parentId),
    );
    connectionStatus = conn?.status ?? 'none';
  }

  // Mutual friends — connected to both me AND them.
  const myConns = connectedParentIds(me);
  const theirConns = connectedParentIds(parentId);
  let mutualFriendCount = 0;
  for (const id of myConns) {
    if (theirConns.has(id)) mutualFriendCount += 1;
  }

  // Activity chips — venues from activities they've interacted with.
  const venueNames = new Set<string>();
  for (const i of mockActivityInteractions) {
    if (i.parent_id !== parentId) continue;
    if (i.state === 'skipped' || i.state === 'saved') continue;
    const activity = activityById(i.activity_id);
    if (!activity) continue;
    const venue = venueById(activity.venue_id);
    if (venue) venueNames.add(`${venue.emoji ?? ''} ${venue.name}`.trim());
  }

  return {
    parent,
    kids,
    connectionStatus,
    mutualFriendCount,
    activityChips: [...venueNames].slice(0, 4),
  };
}

// ─────── connections (You tab requests inbox in Phase 10) ───────

async function getConnections(): Promise<Connection[]> {
  const me = CURRENT_PARENT_ID;
  return mockConnections.filter((c) => c.parent_a === me || c.parent_b === me);
}

/**
 * Send a connection request to another parent.
 * Idempotent — if a connection row already exists between us we return it.
 */
async function requestConnection(otherId: UUID): Promise<Connection> {
  const me = CURRENT_PARENT_ID;
  if (otherId === me) throw new Error('Cannot connect to self');
  const [a, b] = me < otherId ? [me, otherId] : [otherId, me];
  const existing = mockConnections.find(
    (c) => c.parent_a === a && c.parent_b === b,
  );
  if (existing) return existing;
  const inserted: Connection = {
    id: `conn-${a.slice(-6)}-${b.slice(-6)}`,
    parent_a: a,
    parent_b: b,
    status: 'pending',
    initiated_by: me,
    created_at: new Date().toISOString(),
    responded_at: null,
  };
  mockConnections.push(inserted);
  return inserted;
}

// ─────── stories / calendar (architecture stubs) ───────

async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const me = CURRENT_PARENT_ID;
  return mockCalendarEvents.filter((e) => e.parent_id === me);
}

// ─────── posts (compose in Phase 8) ───────

async function createPost(input: Omit<Post, 'id' | 'created_at'>): Promise<Post> {
  const post: Post = {
    ...input,
    id: `post-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  mockPosts.unshift(post);
  return post;
}

// ─────── public interface ───────

export const data = {
  // identity
  getCurrentUser,

  // Buzz
  getFeedPosts,
  getPendingPrompt,
  markPromptActed,
  dismissPrompt,

  // Plans
  getUpcomingActivities,
  getDiscoveredActivityPreviews,
  updateActivityInteraction,

  // IRL
  getNearbyParents,
  getVisibleConnectionAvatars,
  getWarmingUpVenues,
  setMyVisibility,

  // You / profiles
  getProfile,
  getConnections,
  requestConnection,

  // Compose / calendar
  createPost,
  getCalendarEvents,
};
