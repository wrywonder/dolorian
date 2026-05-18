import type { AvatarColor, Timestamp, UUID } from './common';

export type CalendarProvider = 'apple' | 'google';

export type Parent = {
  id: UUID;
  auth_user_id: UUID | null;
  display_name: string;
  neighborhood: string | null;
  avatar_color: AvatarColor;
  avatar_initials: string;
  phone_e164: string | null;
  calendar_connected_at: Timestamp | null;
  calendar_provider: CalendarProvider | null;
  created_at: Timestamp;
};
