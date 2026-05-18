import type { Activity, ActivityInteraction } from '@/types';
import { ACTIVITY_IDS, PARENT_IDS, VENUE_IDS } from './ids';

/**
 * 6 activities matching the spec's source-distribution:
 *  • 3 admin (Saturday Soccer, Wildcat Hike, 10:30 Ballet)
 *  • 1 ai_discovered (Storytime, unpublished — Plans tab preview card)
 *  • 1 calendar_imported (Spring Concert, unpublished — awaits review)
 *  • 1 user_created (Drew's birthday playdate)
 */
export const mockActivities: Activity[] = [
  {
    id: ACTIVITY_IDS.saturday_soccer,
    name: 'Saturday Soccer',
    emoji: '⚽',
    description: 'show up. kick ball. eat snacks.',
    venue_id: VENUE_IDS.cesar_chavez,
    starts_at: '2026-05-24T17:00:00Z', // 10am PT
    ends_at: '2026-05-24T18:30:00Z',
    source: 'admin',
    source_metadata: {},
    confidence_score: null,
    created_by: null,
    published: true,
    created_at: '2026-04-25T00:00:00Z',
  },
  {
    id: ACTIVITY_IDS.wildcat_hike,
    name: 'Wildcat Hike',
    emoji: '🥾',
    description: 'easy 2 mi · carriers welcome',
    venue_id: VENUE_IDS.tilden_park,
    starts_at: '2026-05-25T16:30:00Z', // 9:30am PT
    ends_at: '2026-05-25T18:00:00Z',
    source: 'admin',
    source_metadata: {},
    confidence_score: null,
    created_by: null,
    published: true,
    created_at: '2026-04-25T00:00:00Z',
  },
  {
    id: ACTIVITY_IDS.ten_thirty_ballet,
    name: '10:30 Ballet',
    emoji: '🩰',
    description: 'weekly · ages 5–7',
    venue_id: VENUE_IDS.studio_growlies,
    starts_at: '2026-05-24T17:30:00Z', // 10:30am PT (today, just finished)
    ends_at: '2026-05-24T18:15:00Z',
    source: 'admin',
    source_metadata: {},
    confidence_score: null,
    created_by: null,
    published: true,
    created_at: '2026-04-25T00:00:00Z',
  },
  {
    id: ACTIVITY_IDS.storytime,
    name: 'Saturday Storytime',
    emoji: '📚',
    description: 'free · 4–7 yr olds · ~30min',
    venue_id: null,
    starts_at: '2026-05-31T18:00:00Z',
    ends_at: '2026-05-31T18:45:00Z',
    source: 'ai_discovered',
    source_metadata: {
      discovered_url: 'https://albanylibrary.org/events/storytime-5-31',
      reasoning: 'Public library event matching kids ages 4–7 in Albany',
    },
    confidence_score: 0.87,
    created_by: null,
    published: false,
    created_at: '2026-05-20T03:14:00Z',
  },
  {
    id: ACTIVITY_IDS.spring_concert,
    name: "Sasha's Spring Concert",
    emoji: '🎶',
    description: 'recital — caregivers in main hall',
    venue_id: null,
    starts_at: '2026-05-28T22:00:00Z', // 3pm PT
    ends_at: '2026-05-28T23:00:00Z',
    source: 'calendar_imported',
    source_metadata: {
      calendar_event_id: 'calev-drew-spring-concert',
      original_title: 'Sasha Spring Concert @ school',
    },
    confidence_score: 0.94,
    created_by: null,
    published: false,
    created_at: '2026-05-18T08:00:00Z',
  },
  {
    id: ACTIVITY_IDS.birthday_playdate,
    name: "Sasha's Birthday Playdate",
    emoji: '🎂',
    description: 'low-key picnic — bring frisbees',
    venue_id: VENUE_IDS.cesar_chavez,
    starts_at: '2026-06-07T20:00:00Z', // 1pm PT
    ends_at: '2026-06-07T22:30:00Z',
    source: 'user_created',
    source_metadata: {},
    confidence_score: null,
    created_by: PARENT_IDS.drew,
    published: true,
    created_at: '2026-05-15T20:30:00Z',
  },
];

/**
 * 15 interactions: drives social-proof avatar stacks on Plans and
 * the "warming up" venue list on IRL. Includes Drew's 'attended'
 * state on the 10:30 Ballet — that's the trigger the prompts engine
 * (Phase 8) will key off of to fire the share_after_activity prompt.
 */
export const mockActivityInteractions: ActivityInteraction[] = [
  // Saturday Soccer
  {
    id: 'ai-soccer-drew',
    parent_id: PARENT_IDS.drew,
    activity_id: ACTIVITY_IDS.saturday_soccer,
    state: 'interested',
    state_changed_at: '2026-05-20T14:00:00Z',
    created_at: '2026-05-20T14:00:00Z',
  },
  {
    id: 'ai-soccer-maya',
    parent_id: PARENT_IDS.maya,
    activity_id: ACTIVITY_IDS.saturday_soccer,
    state: 'going',
    state_changed_at: '2026-05-20T15:00:00Z',
    created_at: '2026-05-20T15:00:00Z',
  },
  {
    id: 'ai-soccer-jordan',
    parent_id: PARENT_IDS.jordan,
    activity_id: ACTIVITY_IDS.saturday_soccer,
    state: 'going',
    state_changed_at: '2026-05-21T09:00:00Z',
    created_at: '2026-05-21T09:00:00Z',
  },
  {
    id: 'ai-soccer-priya',
    parent_id: PARENT_IDS.priya,
    activity_id: ACTIVITY_IDS.saturday_soccer,
    state: 'going',
    state_changed_at: '2026-05-22T10:00:00Z',
    created_at: '2026-05-22T10:00:00Z',
  },
  {
    id: 'ai-soccer-sam',
    parent_id: PARENT_IDS.sam,
    activity_id: ACTIVITY_IDS.saturday_soccer,
    state: 'interested',
    state_changed_at: '2026-05-22T11:00:00Z',
    created_at: '2026-05-22T11:00:00Z',
  },
  // Wildcat Hike
  {
    id: 'ai-hike-drew',
    parent_id: PARENT_IDS.drew,
    activity_id: ACTIVITY_IDS.wildcat_hike,
    state: 'interested',
    state_changed_at: '2026-05-23T08:00:00Z',
    created_at: '2026-05-23T08:00:00Z',
  },
  {
    id: 'ai-hike-sam',
    parent_id: PARENT_IDS.sam,
    activity_id: ACTIVITY_IDS.wildcat_hike,
    state: 'going',
    state_changed_at: '2026-05-22T18:00:00Z',
    created_at: '2026-05-22T18:00:00Z',
  },
  {
    id: 'ai-hike-maya',
    parent_id: PARENT_IDS.maya,
    activity_id: ACTIVITY_IDS.wildcat_hike,
    state: 'going',
    state_changed_at: '2026-05-22T19:00:00Z',
    created_at: '2026-05-22T19:00:00Z',
  },
  {
    id: 'ai-hike-jordan',
    parent_id: PARENT_IDS.jordan,
    activity_id: ACTIVITY_IDS.wildcat_hike,
    state: 'interested',
    state_changed_at: '2026-05-23T10:00:00Z',
    created_at: '2026-05-23T10:00:00Z',
  },
  // Ballet — Drew attended (triggers share_after_activity prompt)
  {
    id: 'ai-ballet-drew',
    parent_id: PARENT_IDS.drew,
    activity_id: ACTIVITY_IDS.ten_thirty_ballet,
    state: 'attended',
    state_changed_at: '2026-05-24T18:20:00Z',
    created_at: '2026-05-22T12:00:00Z',
  },
  // Storytime (ai_discovered, unpublished — but Priya marked interest before publish)
  {
    id: 'ai-story-priya',
    parent_id: PARENT_IDS.priya,
    activity_id: ACTIVITY_IDS.storytime,
    state: 'interested',
    state_changed_at: '2026-05-23T14:00:00Z',
    created_at: '2026-05-23T14:00:00Z',
  },
  {
    id: 'ai-story-maya',
    parent_id: PARENT_IDS.maya,
    activity_id: ACTIVITY_IDS.storytime,
    state: 'interested',
    state_changed_at: '2026-05-23T15:00:00Z',
    created_at: '2026-05-23T15:00:00Z',
  },
  // Birthday Playdate (Drew's)
  {
    id: 'ai-bday-drew',
    parent_id: PARENT_IDS.drew,
    activity_id: ACTIVITY_IDS.birthday_playdate,
    state: 'going',
    state_changed_at: '2026-05-15T20:30:00Z',
    created_at: '2026-05-15T20:30:00Z',
  },
  {
    id: 'ai-bday-maya',
    parent_id: PARENT_IDS.maya,
    activity_id: ACTIVITY_IDS.birthday_playdate,
    state: 'interested',
    state_changed_at: '2026-05-16T09:00:00Z',
    created_at: '2026-05-16T09:00:00Z',
  },
  {
    id: 'ai-bday-jordan',
    parent_id: PARENT_IDS.jordan,
    activity_id: ACTIVITY_IDS.birthday_playdate,
    state: 'interested',
    state_changed_at: '2026-05-16T11:00:00Z',
    created_at: '2026-05-16T11:00:00Z',
  },
];
