/**
 * Single data-access interface. All screens import from here.
 *
 * Phase 7: live Supabase queries. Every method is async. RLS handles
 * most visibility filtering — the current user's parent_id is resolved
 * from the auth session and cached per sign-in.
 */

import { supabase } from '@/lib/supabase';
import { deliverVillagePushBestEffort } from '@/lib/push-delivery';
import type {
  Activity,
  ActivityInteraction,
  ActivitySocialProof,
  CalendarEvent,
  BlockedParent,
  ConnectionCircle,
  ConnectionInvite,
  ConnectionInvitePreview,
  ConnectionNotificationPreferences,
  ConnectionPreference,
  CommentView,
  ContactExchange,
  Connection,
  ConnectionView,
  ConnectionStatus,
  FeedItem,
  HangoutSpot,
  InteractionState,
  Kid,
  NearbyParent,
  Parent,
  PlanInput,
  PlanLinkPreview,
  PlanParticipant,
  Post,
  PostComment,
  ProfileView,
  Prompt,
  PromptType,
  ResolvedPrompt,
  ReportReason,
  SuggestedConnection,
  UUID,
  Venue,
  VisibilityMode,
} from '@/types';

const LOCATION_VISIBILITY_MS = 2 * 60 * 60 * 1000;
const PARENT_PUBLIC_COLUMNS = 'id,auth_user_id,display_name,neighborhood,avatar_color,avatar_initials,avatar_url,bio,profile_background,profile_background_url,visibility_mode,calendar_connected_at,calendar_provider,created_at' as const;

function locationExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + LOCATION_VISIBILITY_MS).toISOString();
}

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
    .select(PARENT_PUBLIC_COLUMNS)
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Current user not found');
  return data as Parent;
}

// ─────── feed (Buzz tab) ───────

async function getFeedPosts(): Promise<FeedItem[]> {
  const me = await getCurrentParentId();
  const [{ data: posts, error }, { data: mutedRows, error: mutedError }] = await Promise.all([
    supabase
      .from('posts')
      .select(
        `*, author:parents!author_id(${PARENT_PUBLIC_COLUMNS}), activity:activities(*), venue:venues(*), reactions:post_reactions(count), comments:post_comments(count)`,
      )
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('connection_preferences')
      .select('other_id')
      .eq('owner_id', me)
      .eq('muted', true),
  ]);
  if (error) throw error;
  if (mutedError) throw mutedError;
  const mutedIds = new Set((mutedRows ?? []).map((row) => row.other_id as UUID));
  const visiblePosts = (posts ?? []).filter((row) => !mutedIds.has((row as Record<string, unknown>).author_id as UUID));

  // Which of these posts the current user has reacted to, in one query.
  const postIds = visiblePosts.map((row: Record<string, unknown>) => row.id as string);
  const myReactedIds = new Set<string>();
  if (postIds.length > 0) {
    const { data: mine } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('parent_id', me)
      .in('post_id', postIds);
    for (const r of mine ?? []) {
      myReactedIds.add((r as Record<string, unknown>).post_id as string);
    }
  }

  return visiblePosts.map((row: Record<string, unknown>) => ({
    post: extractPost(row),
    author: row.author as Parent,
    activity: (row.activity as Activity) ?? null,
    venue: (row.venue as Venue) ?? null,
    reactionCount: embeddedCount(row.reactions),
    myReacted: myReactedIds.has(row.id as string),
    commentCount: embeddedCount(row.comments),
  }));
}

/** PostgREST count embeds come back as `[{ count: n }]`. */
function embeddedCount(value: unknown): number {
  const first = (value as { count?: number }[] | null)?.[0];
  return first?.count ?? 0;
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
    reaction_emoji: (row.reaction_emoji as string) ?? null,
    created_at: row.created_at as string,
  };
}

// ─────── reactions & comments ───────

/**
 * Toggle the current user's reaction on a post. Returns true when the
 * post is now reacted-to, false when the reaction was removed.
 */
async function toggleReaction(postId: UUID, emoji: string): Promise<boolean> {
  const me = await getCurrentParentId();
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('parent_id', me)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('id', (existing as { id: string }).id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('post_reactions')
    .insert({ post_id: postId, parent_id: me, emoji });
  if (error) throw error;
  return true;
}

async function getPostComments(postId: UUID): Promise<CommentView[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`*, author:parents!author_id(${PARENT_PUBLIC_COLUMNS})`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { author, ...comment } = row;
    return {
      comment: comment as PostComment,
      // RLS can hide a commenter who isn't connected to the viewer.
      author: (author as Parent) ?? null,
    };
  });
}

async function addComment(postId: UUID, body: string): Promise<void> {
  const me = await getCurrentParentId();
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: me, body });
  if (error) throw error;
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
  const signalId =
    prompt.prompt_type === 'rsvp_from_friend_signal'
      ? (payload.signal_from as string | undefined)
      : undefined;

  const [activityRes, signalRes] = await Promise.all([
    activityId
      ? supabase.from('activities').select('*, venue:venues(*)').eq('id', activityId).maybeSingle()
      : Promise.resolve({ data: null }),
    signalId
      ? supabase.from('parents').select(PARENT_PUBLIC_COLUMNS).eq('id', signalId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let activity: Activity | null = null;
  let venue: Venue | null = null;
  const raw = activityRes.data as (Activity & { venue: Venue | null }) | null;
  if (raw) {
    const { venue: v, ...rest } = raw;
    activity = rest as Activity;
    venue = v ?? null;
  }

  return { prompt, activity, venue, signalFrom: (signalRes.data as Parent | null) ?? null };
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
  if (error) throw error;
  if (!activities) return [];

  const activityIds = activities.map((a: Record<string, unknown>) => a.id as string);
  if (activityIds.length === 0) return [];

  const { data: interactions, error: participantError } = await supabase
    .rpc('plan_participants', { p_plan_ids: activityIds });
  if (participantError) throw participantError;

  return activities.map((row: Record<string, unknown>) =>
    buildSocialProof(row, (interactions ?? []) as PlanParticipant[], me),
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

  const { data: interactions, error: participantError } = await supabase
    .rpc('plan_participants', { p_plan_ids: activityIds });
  if (participantError) throw participantError;

  return activities.map((row: Record<string, unknown>) =>
    buildSocialProof(row, (interactions ?? []) as PlanParticipant[], me),
  );
}

function buildSocialProof(
  row: Record<string, unknown>,
  allInteractions: PlanParticipant[],
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
    visibility: (row.visibility as Activity['visibility']) ?? 'public',
    location_name: (row.location_name as string) ?? null,
    location_address: (row.location_address as string) ?? null,
    external_url: (row.external_url as string) ?? null,
    cover_image_url: (row.cover_image_url as string) ?? null,
    all_day: (row.all_day as boolean) ?? false,
    updated_at: (row.updated_at as string) ?? (row.created_at as string),
    cancelled_at: (row.cancelled_at as string) ?? null,
    created_at: row.created_at as string,
  };
  const venue = (row.venue as Venue) ?? null;

  const rows = allInteractions.filter(
    (i) => i.plan_id === activity.id,
  );

  const interestedConnections: PlanParticipant[] = [];
  const goingConnections: PlanParticipant[] = [];
  const outConnections: PlanParticipant[] = [];
  let myState: InteractionState | null = null;
  let myRsvpNote: string | null = null;

  for (const i of rows) {
    const parentId = i.parent_id;
    const state = i.state;
    if (parentId === me) {
      myState = state;
      myRsvpNote = i.rsvp_note ?? null;
      continue;
    }
    if (state === 'interested') interestedConnections.push(i);
    else if (state === 'going' || state === 'attended') goingConnections.push(i);
    else if (state === 'out') outConnections.push(i);
  }

  return { activity, venue, interestedConnections, goingConnections, outConnections, myState, myRsvpNote };
}

async function getPlan(planId: UUID): Promise<ActivitySocialProof | null> {
  const me = await getCurrentParentId();
  const { data: plan, error } = await supabase
    .from('activities')
    .select('*, venue:venues(*)')
    .eq('id', planId)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const { data: participants, error: participantError } = await supabase
    .rpc('plan_participants', { p_plan_ids: [planId] });
  if (participantError) throw participantError;
  return buildSocialProof(plan as Record<string, unknown>, (participants ?? []) as PlanParticipant[], me);
}

async function getPlanInviteeIds(planId: UUID): Promise<UUID[]> {
  const { data: rows, error } = await supabase
    .from('plan_invites')
    .select('invited_parent_id')
    .eq('plan_id', planId);
  if (error) throw error;
  return (rows ?? []).map((row) => row.invited_parent_id as UUID);
}

type PlanMutationResult = {
  plan: Activity;
  notified_parent_ids: UUID[];
};

function planRpcArgs(input: PlanInput) {
  return {
    p_name: input.name,
    p_description: input.description,
    p_emoji: input.emoji,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_all_day: input.all_day,
    p_visibility: input.visibility,
    p_invited_parent_ids: input.invited_parent_ids,
    p_location_name: input.location_name,
    p_location_address: input.location_address,
    p_external_url: input.external_url || null,
    p_cover_image_url: input.cover_image_url || null,
  };
}

async function createPlan(input: PlanInput): Promise<Activity> {
  const { data: result, error } = await supabase.rpc('create_plan', planRpcArgs(input));
  if (error) throw error;
  const payload = result as PlanMutationResult;
  await Promise.all((payload.notified_parent_ids ?? []).map((parentId) =>
    deliverVillagePushBestEffort(parentId, 'plan_invite')));
  return payload.plan;
}

async function updatePlan(planId: UUID, input: PlanInput): Promise<Activity> {
  const { data: result, error } = await supabase.rpc('update_plan', {
    p_plan: planId,
    ...planRpcArgs(input),
  });
  if (error) throw error;
  const payload = result as PlanMutationResult;
  await Promise.all((payload.notified_parent_ids ?? []).map((parentId) =>
    deliverVillagePushBestEffort(parentId, 'plan_invite')));
  return payload.plan;
}

async function cancelPlan(planId: UUID): Promise<void> {
  const { error } = await supabase.rpc('cancel_plan', { p_plan: planId });
  if (error) throw error;
}

async function setPlanRsvp(
  planId: UUID,
  state: 'interested' | 'going' | 'out',
  note?: string,
): Promise<ActivityInteraction> {
  const args: { p_plan: UUID; p_state: string; p_note?: string } = {
    p_plan: planId,
    p_state: state,
  };
  if (note !== undefined) args.p_note = note;
  const { data: result, error } = await supabase.rpc('set_plan_rsvp', args);
  if (error) throw error;
  return result as ActivityInteraction;
}

async function clearPlanRsvp(planId: UUID): Promise<void> {
  const { error } = await supabase.rpc('clear_plan_rsvp', { p_plan: planId });
  if (error) throw error;
}

async function importPlanLink(url: string): Promise<PlanLinkPreview> {
  const { data: result, error } = await supabase.functions.invoke('plan-link-preview', {
    body: { url },
  });
  if (error) throw error;
  if (result?.error) throw new Error(result.error as string);
  return result as PlanLinkPreview;
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
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('parent_locations')
    .select(`*, parent:parents(${PARENT_PUBLIC_COLUMNS}), venue:venues(*)`)
    .or(`visible.eq.true,auto_share_at.lte.${now}`)
    .gt('expires_at', now);
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
      auto_share_at: (row.auto_share_at as string) ?? null,
    },
    venue: (row.venue as Venue) ?? null,
  }));
}

async function getVisibleConnectionAvatars(): Promise<Parent[]> {
  const me = await getCurrentParentId();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('parent_locations')
    .select(`parent:parents(${PARENT_PUBLIC_COLUMNS})`)
    .or(`visible.eq.true,auto_share_at.lte.${now}`)
    .gt('expires_at', now)
    .neq('parent_id', me);
  if (error || !data) return [];
  return data
    .map((row: Record<string, unknown>) => row.parent as Parent | null)
    .filter((p): p is Parent => p !== null);
}

async function getWarmingUpVenues(): Promise<{ venue: Venue; count: number }[]> {
  const me = await getCurrentParentId();
  const now = new Date().toISOString();

  // All venues + visible parents per venue (excluding self), in parallel
  const [{ data: venues }, { data: locations }] = await Promise.all([
    supabase.from('venues').select('*'),
    supabase
      .from('parent_locations')
      .select('venue_id')
      .or(`visible.eq.true,auto_share_at.lte.${now}`)
      .gt('expires_at', now)
      .neq('parent_id', me),
  ]);
  if (!venues) return [];

  const counts = new Map<string, number>();
  for (const loc of locations ?? []) {
    const vid = (loc as Record<string, unknown>).venue_id as string | null;
    if (vid) counts.set(vid, (counts.get(vid) ?? 0) + 1);
  }

  return (venues as Venue[])
    .map((venue) => ({ venue, count: counts.get(venue.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

async function setVisibilityMode(mode: VisibilityMode): Promise<void> {
  const me = await getCurrentParentId();
  const now = new Date();
  const { error } = await supabase.from('parents').update({ visibility_mode: mode }).eq('id', me);
  if (error) throw error;

  if (mode === 'disabled') {
    const { error: locationError } = await supabase.from('parent_locations').upsert({
      parent_id: me,
      venue_id: null,
      visible: false,
      auto_share_at: null,
      last_seen_at: now.toISOString(),
      expires_at: now.toISOString(),
    }, { onConflict: 'parent_id' });
    if (locationError) throw locationError;
  } else if (mode === 'on') {
    const { data: current } = await supabase
      .from('parent_locations')
      .select('venue_id')
      .eq('parent_id', me)
      .maybeSingle();
    if (current?.venue_id) {
      const { error: locationError } = await supabase.from('parent_locations').upsert({
        parent_id: me,
        visible: true,
        auto_share_at: null,
        last_seen_at: now.toISOString(),
        expires_at: locationExpiry(now),
      }, { onConflict: 'parent_id' });
      if (locationError) throw locationError;
    }
  }
}

async function createVenue(input: {
  name: string;
  emoji: string | null;
  venue_type: Venue['venue_type'];
  lat: number;
  lng: number;
}): Promise<Venue> {
  const { data, error } = await supabase
    .rpc('create_hangout_venue', {
      venue_name: input.name,
      venue_emoji: input.emoji,
      venue_type: input.venue_type,
      venue_lat: input.lat,
      venue_lng: input.lng,
    });
  if (error || !data) throw error ?? new Error('Could not create that hangout.');
  return data as Venue;
}

async function checkInAtVenue(venueId: UUID): Promise<void> {
  const me = await getCurrentParentId();
  const now = new Date();
  const { error } = await supabase
    .from('parent_locations')
    .upsert(
      {
        parent_id: me,
        venue_id: venueId,
        visible: true,
        auto_share_at: null,
        last_seen_at: now.toISOString(),
        expires_at: locationExpiry(now),
      },
      { onConflict: 'parent_id' },
    );
  if (error) throw error;
}

async function beginHangoutVisit(venueId: UUID): Promise<VisibilityMode> {
  const me = await getCurrentParentId();
  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('visibility_mode')
    .eq('id', me)
    .single();
  if (parentError || !parent) throw parentError ?? new Error('Profile not found');
  const mode = parent.visibility_mode as VisibilityMode;
  if (mode === 'disabled') return mode;

  const now = new Date();
  const { error } = await supabase.from('parent_locations').upsert({
    parent_id: me,
    venue_id: venueId,
    visible: mode === 'on',
    auto_share_at: mode === 'auto'
      ? new Date(now.getTime() + 5 * 60 * 1000).toISOString()
      : null,
    last_seen_at: now.toISOString(),
    expires_at: locationExpiry(now),
  }, { onConflict: 'parent_id' });
  if (error) throw error;
  return mode;
}

async function endHangoutVisit(venueId: UUID): Promise<void> {
  const me = await getCurrentParentId();
  const now = new Date().toISOString();
  const { error } = await supabase.from('parent_locations').update({
    venue_id: null,
    visible: false,
    auto_share_at: null,
    last_seen_at: now,
    expires_at: now,
  }).eq('parent_id', me).eq('venue_id', venueId);
  if (error) throw error;
}

async function getMyVisibility(): Promise<{ mode: VisibilityMode; visible: boolean }> {
  const me = await getCurrentParentId();
  const [{ data: parent, error }, { data: location }] = await Promise.all([
    supabase.from('parents').select('visibility_mode').eq('id', me).single(),
    supabase.from('parent_locations').select('visible, auto_share_at, expires_at').eq('parent_id', me).maybeSingle(),
  ]);
  if (error || !parent) throw error ?? new Error('Profile not found');
  const expiresAt = (location?.expires_at as string | null) ?? null;
  const autoShareAt = (location?.auto_share_at as string | null) ?? null;
  const active = Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now());
  return {
    mode: parent.visibility_mode as VisibilityMode,
    visible: active && Boolean(location?.visible || (autoShareAt && new Date(autoShareAt).getTime() <= Date.now())),
  };
}

async function getHangoutSpots(): Promise<HangoutSpot[]> {
  const me = await getCurrentParentId();
  const [{ data: venues, error: venueError }, { data: rows, error: rowError }, { data: parents }] = await Promise.all([
    supabase.from('venues').select('*'),
    supabase.from('parent_hangout_spots').select('id, parent_id, venue_id, enabled, venue:venues(*)'),
    supabase.from('parents').select('id, display_name'),
  ]);
  if (venueError) throw venueError;
  if (rowError) throw rowError;

  const names = new Map((parents ?? []).map((parent) => [parent.id as UUID, parent.display_name as string]));
  const ownOverrides = new Map<UUID, { id: UUID; enabled: boolean }>();
  for (const row of rows ?? []) {
    if (row.parent_id === me) ownOverrides.set(row.venue_id as UUID, { id: row.id as UUID, enabled: Boolean(row.enabled) });
  }

  const byVenue = new Map<UUID, HangoutSpot>();
  for (const venue of (venues ?? []) as Venue[]) {
    const own = ownOverrides.get(venue.id);
    if (!venue.default_hangout && !own) continue;
    byVenue.set(venue.id, {
      id: own?.id ?? null,
      parent_id: own ? me : null,
      venue,
      enabled: own?.enabled ?? venue.default_hangout,
      is_default: venue.default_hangout,
      is_mine: own?.enabled ?? venue.default_hangout,
      suggested_by: [],
    });
  }

  for (const raw of rows ?? []) {
    if (!raw.enabled) continue;
    const venue = raw.venue as unknown as Venue | null;
    if (!venue) continue;
    const parentId = raw.parent_id as UUID;
    const existing = byVenue.get(venue.id) ?? {
      id: null,
      parent_id: null,
      venue,
      enabled: false,
      is_default: venue.default_hangout,
      is_mine: false,
      suggested_by: [],
    };
    if (parentId === me) {
      existing.id = raw.id as UUID;
      existing.parent_id = me;
      existing.enabled = true;
      existing.is_mine = true;
    } else {
      const name = names.get(parentId);
      if (name && !existing.suggested_by.includes(name)) existing.suggested_by.push(name);
    }
    byVenue.set(venue.id, existing);
  }

  return [...byVenue.values()].sort((a, b) => {
    if (a.is_mine !== b.is_mine) return a.is_mine ? -1 : 1;
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.venue.name.localeCompare(b.venue.name);
  });
}

async function setHangoutSpot(venueId: UUID, enabled: boolean): Promise<void> {
  const me = await getCurrentParentId();
  const { error } = await supabase.from('parent_hangout_spots').upsert({
    parent_id: me,
    venue_id: venueId,
    enabled,
  }, { onConflict: 'parent_id,venue_id' });
  if (error) throw error;
}

// ─────── profile (You tab + profile/[id]) ───────

async function getProfile(parentId: UUID): Promise<ProfileView | null> {
  const me = await getCurrentParentId();
  const isSelf = parentId === me;
  const [a, b] = me < parentId ? [me, parentId] : [parentId, me];

  const [parentRes, kidsRes, connRes, mutualRes, interactionsRes] = await Promise.all([
    supabase.from('parents').select(PARENT_PUBLIC_COLUMNS).eq('id', parentId).maybeSingle(),
    supabase.from('kids').select('*').eq('parent_id', parentId),
    isSelf
      ? Promise.resolve({ data: null })
      : supabase
          .from('connections')
          .select('status, initiated_by')
          .eq('parent_a', a)
          .eq('parent_b', b)
          .maybeSingle(),
    // RLS only exposes connections involving me, so mutual friends are
    // computed server-side by a security-definer function.
    isSelf
      ? Promise.resolve({ data: 0 })
      : supabase.rpc('mutual_friend_count', { other: parentId }),
    supabase
      .from('activity_interactions')
      .select('activity:activities(name, venue_id, venue:venues(name, emoji))')
      .eq('parent_id', parentId)
      .not('state', 'in', '("skipped","saved")'),
  ]);

  const parent = parentRes.data;
  if (!parent) return null;

  const kids = kidsRes.data;
  const connectionStatus: ConnectionStatus | 'none' =
    ((connRes.data as { status: ConnectionStatus } | null)?.status) ?? 'none';
  const connectionInitiatedByMe = connectionStatus === 'pending'
    ? (connRes.data as { initiated_by: UUID }).initiated_by === me
    : null;
  const mutualFriendCount = (mutualRes.data as number | null) ?? 0;
  const interactions = interactionsRes.data;

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
    connectionInitiatedByMe,
    mutualFriendCount,
    activityChips: [...venueNames].slice(0, 4),
  };
}

async function updateMyProfile(input: {
  display_name: string;
  neighborhood: string | null;
  avatar_color: Parent['avatar_color'];
  avatar_url: string | null;
  bio: string | null;
  profile_background: Parent['profile_background'];
  profile_background_url: string | null;
}): Promise<Parent> {
  const me = await getCurrentParentId();
  const displayName = input.display_name.trim();
  if (!displayName) throw new Error('Name is required');
  const avatarInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
  const { data, error } = await supabase
    .from('parents')
    .update({
      display_name: displayName,
      neighborhood: input.neighborhood?.trim() || null,
      avatar_color: input.avatar_color,
      avatar_initials: avatarInitials || '?',
      avatar_url: input.avatar_url,
      bio: input.bio?.trim() || null,
      profile_background: input.profile_background,
      profile_background_url: input.profile_background_url,
    })
    .eq('id', me)
    .select()
    .single();
  if (error) throw error;
  return data as Parent;
}

async function saveMyKids(
  kids: {
    id?: UUID;
    name: string;
    birth_year: number;
    interests: string[];
    avatar_url?: string | null;
  }[],
): Promise<Kid[]> {
  const me = await getCurrentParentId();
  const currentYear = new Date().getFullYear();
  const normalized = kids.map((kid) => ({
    ...kid,
    name: kid.name.trim(),
    interests: kid.interests.map((interest) => interest.trim()).filter(Boolean),
  }));
  if (normalized.some((kid) => !kid.name)) throw new Error('Each kid needs a name');
  if (normalized.some((kid) => kid.birth_year < 2000 || kid.birth_year > currentYear)) {
    throw new Error(`Birth years must be between 2000 and ${currentYear}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from('kids')
    .select('id')
    .eq('parent_id', me);
  if (existingError) throw existingError;

  const keptIds = normalized.flatMap((kid) => kid.id ? [kid.id] : []);
  const removedIds = (existing ?? [])
    .map((row) => (row as { id: UUID }).id)
    .filter((id) => !keptIds.includes(id));
  if (removedIds.length > 0) {
    const { error } = await supabase
      .from('kids')
      .delete()
      .eq('parent_id', me)
      .in('id', removedIds);
    if (error) throw error;
  }

  if (normalized.length === 0) return [];
  const rows = normalized.map((kid) => ({
    ...(kid.id ? { id: kid.id } : {}),
    parent_id: me,
    name: kid.name,
    birth_year: kid.birth_year,
    interests: kid.interests,
    avatar_url: kid.avatar_url ?? null,
  }));
  const { data, error } = await supabase
    .from('kids')
    .upsert(rows)
    .select();
  if (error) throw error;
  return (data ?? []) as Kid[];
}

// ─────── connections ───────

async function getConnections(): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections')
    .select('*');
  if (error) throw error;
  return (data ?? []) as Connection[];
}

async function getConnectionViews(): Promise<ConnectionView[]> {
  const me = await getCurrentParentId();
  const [{ data: rows, error }, { data: preferenceRows, error: preferenceError }] = await Promise.all([
    supabase
      .from('connections')
      .select(`*, parentA:parents!parent_a(${PARENT_PUBLIC_COLUMNS}), parentB:parents!parent_b(${PARENT_PUBLIC_COLUMNS})`)
      .order('created_at', { ascending: false }),
    supabase
      .from('connection_preferences')
      .select('*')
      .eq('owner_id', me),
  ]);
  if (error) throw error;
  if (preferenceError) throw preferenceError;
  const preferences = new Map(
    (preferenceRows ?? []).map((row) => [(row as ConnectionPreference).other_id, row as ConnectionPreference]),
  );
  return (rows ?? []).flatMap((row: Record<string, unknown>) => {
    const connection: Connection = {
      id: row.id as UUID,
      parent_a: row.parent_a as UUID,
      parent_b: row.parent_b as UUID,
      status: row.status as ConnectionStatus,
      initiated_by: row.initiated_by as UUID,
      created_at: row.created_at as string,
      responded_at: (row.responded_at as string) ?? null,
    };
    const parent = (connection.parent_a === me ? row.parentB : row.parentA) as Parent | null;
    if (!parent) return [];
    return [{
      connection,
      parent,
      incoming: connection.status === 'pending' && connection.initiated_by !== me,
      outgoing: connection.status === 'pending' && connection.initiated_by === me,
      preference: preferences.get(parent.id) ?? {
        owner_id: me,
        other_id: parent.id,
        favorite: false,
        muted: false,
        location_visible: true,
        note: null,
        updated_at: connection.responded_at ?? connection.created_at,
      },
    }];
  });
}

async function requestConnection(otherId: UUID): Promise<Connection> {
  const { data, error } = await supabase.rpc('request_connection', { other: otherId });
  if (error) throw error;
  await deliverVillagePushBestEffort(otherId, 'connection_request');
  return data as Connection;
}

async function respondToConnection(otherId: UUID, accept: boolean): Promise<Connection> {
  const { data, error } = await supabase.rpc('respond_connection', { other: otherId, accept });
  if (error) throw error;
  if (accept) await deliverVillagePushBestEffort(otherId, 'connection_accepted');
  return data as Connection;
}

async function acceptConnection(otherId: UUID): Promise<Connection> {
  const connection = await respondToConnection(otherId, true);
  return connection;
}

async function declineConnection(otherId: UUID): Promise<Connection> {
  return respondToConnection(otherId, false);
}

async function cancelConnectionRequest(otherId: UUID): Promise<void> {
  const { error } = await supabase.rpc('cancel_connection_request', { other: otherId });
  if (error) throw error;
}

async function removeConnection(otherId: UUID): Promise<void> {
  const { error } = await supabase.rpc('remove_connection', { other: otherId });
  if (error) throw error;
}

async function blockConnection(otherId: UUID): Promise<void> {
  const { error } = await supabase.rpc('block_parent', { other: otherId });
  if (error) throw error;
}

async function unblockParent(otherId: UUID): Promise<void> {
  const { error } = await supabase.rpc('unblock_parent', { other: otherId });
  if (error) throw error;
}

async function getIncomingConnectionCount(): Promise<number> {
  const me = await getCurrentParentId();
  const { count, error } = await supabase
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .neq('initiated_by', me);
  if (error) throw error;
  return count ?? 0;
}

async function getBlockedParents(): Promise<BlockedParent[]> {
  const { data, error } = await supabase.rpc('blocked_parents');
  if (error) throw error;
  return (data ?? []) as BlockedParent[];
}

async function getSuggestedConnections(limit = 8): Promise<SuggestedConnection[]> {
  const { data, error } = await supabase.rpc('suggested_connections', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as SuggestedConnection[];
}

async function getConnectionInvites(): Promise<ConnectionInvite[]> {
  const { data, error } = await supabase
    .from('connection_invites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConnectionInvite[];
}

async function createConnectionInvite(maxUses = 10): Promise<ConnectionInvite> {
  const { data, error } = await supabase.rpc('create_connection_invite', { p_max_uses: maxUses });
  if (error) throw error;
  return data as ConnectionInvite;
}

async function revokeConnectionInvite(inviteId: UUID): Promise<void> {
  const { error } = await supabase.rpc('revoke_connection_invite', { invite_id: inviteId });
  if (error) throw error;
}

async function previewConnectionInvite(reference: string): Promise<ConnectionInvitePreview> {
  const { data, error } = await supabase.rpc('preview_connection_invite', { p_reference: reference.trim() });
  if (error) throw error;
  return data as ConnectionInvitePreview;
}

async function redeemConnectionInvite(reference: string): Promise<Connection> {
  const { data, error } = await supabase.rpc('redeem_connection_invite', { p_reference: reference.trim() });
  if (error) throw error;
  const connection = data as Connection;
  const me = await getCurrentParentId();
  const inviter = connection.parent_a === me ? connection.parent_b : connection.parent_a;
  await deliverVillagePushBestEffort(inviter, 'invite_redeemed');
  return connection;
}

async function setConnectionPreferences(
  otherId: UUID,
  preference: Pick<ConnectionPreference, 'favorite' | 'muted' | 'location_visible' | 'note'>,
): Promise<ConnectionPreference> {
  const { data, error } = await supabase.rpc('set_connection_preferences', {
    other: otherId,
    p_favorite: preference.favorite,
    p_muted: preference.muted,
    p_location_visible: preference.location_visible,
    p_note: preference.note ?? '',
  });
  if (error) throw error;
  return data as ConnectionPreference;
}

async function getConnectionCircles(): Promise<ConnectionCircle[]> {
  const { data, error } = await supabase
    .from('connection_circles')
    .select('*, members:connection_circle_members(parent_id)')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as UUID,
    owner_id: row.owner_id as UUID,
    name: row.name as string,
    emoji: row.emoji as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    memberIds: ((row.members as { parent_id: UUID }[] | null) ?? []).map((member) => member.parent_id),
  }));
}

async function createConnectionCircle(name: string, emoji: string): Promise<ConnectionCircle> {
  const me = await getCurrentParentId();
  const { data, error } = await supabase
    .from('connection_circles')
    .insert({ owner_id: me, name: name.trim(), emoji })
    .select()
    .single();
  if (error) throw error;
  return { ...(data as Omit<ConnectionCircle, 'memberIds'>), memberIds: [] };
}

async function deleteConnectionCircle(circleId: UUID): Promise<void> {
  const { error } = await supabase.from('connection_circles').delete().eq('id', circleId);
  if (error) throw error;
}

async function setConnectionCircleMembers(circleId: UUID, memberIds: UUID[]): Promise<void> {
  const { error } = await supabase.rpc('set_circle_members', { p_circle: circleId, p_members: memberIds });
  if (error) throw error;
}

async function getMyPhone(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_phone');
  if (error) throw error;
  return (data as string | null) ?? null;
}

async function setMyPhone(phone: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_my_phone', { p_phone: phone });
  if (error) throw error;
  return (data as string | null) ?? null;
}

async function getContactExchange(otherId: UUID): Promise<ContactExchange> {
  const { data, error } = await supabase.rpc('get_contact_exchange', { other: otherId });
  if (error) throw error;
  return data as ContactExchange;
}

async function setContactShare(otherId: UUID, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_contact_share', { other: otherId, enabled });
  if (error) throw error;
}

async function submitParentReport(otherId: UUID, reason: ReportReason, details: string): Promise<UUID> {
  const { data, error } = await supabase.rpc('submit_parent_report', {
    other: otherId,
    p_reason: reason,
    p_details: details,
  });
  if (error) throw error;
  return data as UUID;
}

async function getConnectionNotificationPreferences(): Promise<ConnectionNotificationPreferences> {
  const me = await getCurrentParentId();
  const { error: insertError } = await supabase
    .from('parent_notification_preferences')
    .upsert({ parent_id: me }, { onConflict: 'parent_id', ignoreDuplicates: true });
  if (insertError) throw insertError;
  const { data, error } = await supabase
    .from('parent_notification_preferences')
    .select('*')
    .eq('parent_id', me)
    .single();
  if (error) throw error;
  return data as ConnectionNotificationPreferences;
}

async function updateConnectionNotificationPreferences(
  preference: Pick<ConnectionNotificationPreferences, 'connection_requests' | 'connection_acceptances' | 'invite_redemptions' | 'plan_invitations'>,
): Promise<ConnectionNotificationPreferences> {
  const me = await getCurrentParentId();
  const { data, error } = await supabase
    .from('parent_notification_preferences')
    .upsert({ parent_id: me, ...preference, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as ConnectionNotificationPreferences;
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

async function deletePost(postId: UUID): Promise<void> {
  // Grab the media path first so the storage object can be cleaned up.
  const { data: post } = await supabase
    .from('posts')
    .select('media_path')
    .eq('id', postId)
    .maybeSingle();

  // RLS (posts_write_own) guarantees only the author's delete succeeds.
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;

  // Best-effort image cleanup — the post row is already gone, so a
  // failure here just leaves an orphaned object, never a broken feed.
  const mediaPath = (post as { media_path: string | null } | null)?.media_path;
  const marker = '/post-images/';
  const idx = mediaPath?.indexOf(marker) ?? -1;
  if (mediaPath && idx !== -1) {
    const objectPath = mediaPath.slice(idx + marker.length);
    await supabase.storage.from('post-images').remove([objectPath]);
  }
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
  getPlan,
  getPlanInviteeIds,
  createPlan,
  updatePlan,
  cancelPlan,
  setPlanRsvp,
  clearPlanRsvp,
  importPlanLink,
  updateActivityInteraction,
  getNearbyParents,
  getVisibleConnectionAvatars,
  getWarmingUpVenues,
  setVisibilityMode,
  getMyVisibility,
  beginHangoutVisit,
  endHangoutVisit,
  getHangoutSpots,
  setHangoutSpot,
  createVenue,
  checkInAtVenue,
  getProfile,
  updateMyProfile,
  saveMyKids,
  getConnections,
  getConnectionViews,
  requestConnection,
  acceptConnection,
  declineConnection,
  cancelConnectionRequest,
  removeConnection,
  blockConnection,
  unblockParent,
  getIncomingConnectionCount,
  getBlockedParents,
  getSuggestedConnections,
  getConnectionInvites,
  createConnectionInvite,
  revokeConnectionInvite,
  previewConnectionInvite,
  redeemConnectionInvite,
  setConnectionPreferences,
  getConnectionCircles,
  createConnectionCircle,
  deleteConnectionCircle,
  setConnectionCircleMembers,
  getMyPhone,
  setMyPhone,
  getContactExchange,
  setContactShare,
  submitParentReport,
  getConnectionNotificationPreferences,
  updateConnectionNotificationPreferences,
  createPost,
  deletePost,
  getCalendarEvents,
  toggleReaction,
  getPostComments,
  addComment,
};
