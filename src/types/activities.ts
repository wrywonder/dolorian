import type { Timestamp, UUID } from './common';

export type ActivitySource =
  | 'admin'
  | 'user_created'
  | 'ai_discovered'
  | 'calendar_imported'
  | 'participant_added';

export type Activity = {
  id: UUID;
  name: string;
  emoji: string | null;
  description: string | null;
  venue_id: UUID | null;
  starts_at: Timestamp | null;
  ends_at: Timestamp | null;
  source: ActivitySource;
  source_metadata: Record<string, unknown>;
  confidence_score: number | null;
  created_by: UUID | null;
  published: boolean;
  created_at: Timestamp;
};

export type InteractionState =
  | 'saved'
  | 'interested'
  | 'going'
  | 'attended'
  | 'skipped';

export type ActivityInteraction = {
  id: UUID;
  parent_id: UUID;
  activity_id: UUID;
  state: InteractionState;
  state_changed_at: Timestamp;
  created_at: Timestamp;
};
