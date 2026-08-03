import type { AvatarColor, Timestamp, UUID } from './common';

export type ActivitySource =
  | 'admin'
  | 'user_created'
  | 'ai_discovered'
  | 'calendar_imported'
  | 'participant_added';

export type PlanVisibility = 'public' | 'connections' | 'invited';

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
  visibility: PlanVisibility;
  location_name: string | null;
  location_address: string | null;
  external_url: string | null;
  cover_image_url: string | null;
  all_day: boolean;
  updated_at: Timestamp;
  cancelled_at: Timestamp | null;
  created_at: Timestamp;
};

export type InteractionState =
  | 'saved'
  | 'interested'
  | 'going'
  | 'attended'
  | 'out'
  | 'skipped';

export type ActivityInteraction = {
  id: UUID;
  parent_id: UUID;
  activity_id: UUID;
  state: InteractionState;
  rsvp_note?: string | null;
  state_changed_at: Timestamp;
  created_at: Timestamp;
};

export type PlanParticipant = {
  plan_id: UUID;
  parent_id: UUID;
  display_name: string;
  neighborhood: string | null;
  avatar_color: AvatarColor;
  avatar_initials: string;
  avatar_url: string | null;
  profile_visible: boolean;
  state: Extract<InteractionState, 'interested' | 'going' | 'attended' | 'out'>;
  rsvp_note: string | null;
  state_changed_at: Timestamp;
};

export type PlanInput = {
  name: string;
  description: string;
  emoji: string;
  starts_at: Timestamp;
  ends_at: Timestamp | null;
  all_day: boolean;
  visibility: PlanVisibility;
  invited_parent_ids: UUID[];
  location_name: string;
  location_address: string;
  external_url: string;
  cover_image_url: string;
};

export type PlanLinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  emoji: string | null;
  locationName: string | null;
  locationAddress: string | null;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  allDay: boolean | null;
  importedFields: string[];
  inference: 'ai' | 'structured' | 'metadata';
};
