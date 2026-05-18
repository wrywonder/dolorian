import type { DateOnly, Timestamp, UUID } from './common';

export type Story = {
  id: UUID;
  parent_id: UUID;
  period_start: DateOnly;
  period_end: DateOnly;
  title: string | null;
  ai_generated_summary: string | null;
  cover_post_id: UUID | null;
  published: boolean;
  created_at: Timestamp;
};

export type StoryMoment = {
  id: UUID;
  story_id: UUID;
  ordinal: number;
  /** Exactly one of post_id / activity_interaction_id / location_event_id is set. */
  post_id: UUID | null;
  activity_interaction_id: UUID | null;
  location_event_id: UUID | null;
};
