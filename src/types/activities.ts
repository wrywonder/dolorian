import type { AvatarColor, Timestamp, UUID } from './common';

export type ActivitySource =
  | 'admin'
  | 'user_created'
  | 'ai_discovered'
  | 'calendar_imported'
  | 'participant_added';

export type PlanVisibility = 'public' | 'connections' | 'invited';
export type PlanKind = 'gathering' | 'signup';
export type PlanScheduleKind = 'once' | 'weekly';
export type PlanWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
  external_source_key: string | null;
  cover_image_url: string | null;
  all_day: boolean;
  /** Absent on legacy plans; only those plans infer signup intent from a URL. */
  plan_kind?: PlanKind | null;
  /** Legacy null schedules retain their original contiguous date range. */
  schedule_kind?: PlanScheduleKind | null;
  schedule_days?: PlanWeekday[] | null;
  schedule_timezone?: string | null;
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
  plan_kind: PlanKind;
  name: string;
  description: string;
  emoji: string;
  starts_at: Timestamp | null;
  ends_at: Timestamp | null;
  all_day: boolean;
  schedule_kind: PlanScheduleKind;
  schedule_days: PlanWeekday[];
  schedule_timezone: string;
  visibility: PlanVisibility;
  invited_parent_ids: UUID[];
  location_name: string;
  location_address: string;
  external_url: string;
  external_source_key: string;
  cover_image_url: string;
};

/** Safe identity attached only after the server verifies access to the plan. */
export type PlanSharedBy = {
  parent_id: UUID;
  display_name: string;
  avatar_color: AvatarColor;
  avatar_initials: string;
  avatar_url: string | null;
  profile_visible: boolean;
};

export type PlanLinkPreview = {
  url: string;
  sourceKey: string;
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
  inference: 'ai' | 'structured' | 'metadata' | 'provider';
  warnings: string[];
};
