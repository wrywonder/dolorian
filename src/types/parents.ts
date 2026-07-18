import type { AvatarColor, Timestamp, UUID } from './common';

export type CalendarProvider = 'apple' | 'google';
export type VisibilityMode = 'on' | 'auto' | 'disabled';

export type Parent = {
  id: UUID;
  auth_user_id: UUID | null;
  display_name: string;
  neighborhood: string | null;
  avatar_color: AvatarColor;
  avatar_initials: string;
  avatar_url: string | null;
  bio: string | null;
  profile_background: AvatarColor;
  visibility_mode: VisibilityMode;
  phone_e164: string | null;
  calendar_connected_at: Timestamp | null;
  calendar_provider: CalendarProvider | null;
  created_at: Timestamp;
};
