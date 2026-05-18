import type { Timestamp, UUID } from './common';

export type CalendarEvent = {
  id: UUID;
  parent_id: UUID;
  source_event_id: string;
  raw_title: string;
  parsed_at: Timestamp;
  extracted_activity_id: UUID | null;
  user_confirmed: boolean | null;
};
