import type { Timestamp, UUID } from './common';

export type PromptType =
  | 'share_after_activity'
  | 'rsvp_from_friend_signal'
  | 'confirm_calendar_import'
  | 'finalize_weekend_story';

export type PromptState =
  | 'pending'
  | 'shown'
  | 'acted'
  | 'dismissed'
  | 'expired';

/**
 * Typed payload shapes per prompt_type. The DB column is jsonb; the runtime
 * boundary is `parsePromptPayload(prompt)` in src/lib/prompts.ts (Phase 8).
 */
export type ShareAfterActivityPayload = {
  activity_id: UUID;
};

export type RsvpFromFriendSignalPayload = {
  activity_id: UUID;
  /** the connected parent who marked interested/going */
  signal_from: UUID;
};

export type ConfirmCalendarImportPayload = {
  activity_id: UUID;
  calendar_event_id: UUID;
};

export type FinalizeWeekendStoryPayload = {
  period_start: string;
  period_end: string;
};

export type PromptPayloadByType = {
  share_after_activity: ShareAfterActivityPayload;
  rsvp_from_friend_signal: RsvpFromFriendSignalPayload;
  confirm_calendar_import: ConfirmCalendarImportPayload;
  finalize_weekend_story: FinalizeWeekendStoryPayload;
};

export type Prompt<T extends PromptType = PromptType> = {
  id: UUID;
  parent_id: UUID;
  prompt_type: T;
  payload: PromptPayloadByType[T];
  state: PromptState;
  created_at: Timestamp;
  expires_at: Timestamp | null;
};
