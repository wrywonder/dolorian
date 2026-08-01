import type { Timestamp, UUID } from './common';

export type ConnectionStatus = 'pending' | 'connected' | 'declined' | 'blocked';

export type Connection = {
  id: UUID;
  /** parent_a < parent_b in the canonical row ordering */
  parent_a: UUID;
  parent_b: UUID;
  status: ConnectionStatus;
  initiated_by: UUID;
  created_at: Timestamp;
  responded_at: Timestamp | null;
};

export type ConnectionPreference = {
  owner_id: UUID;
  other_id: UUID;
  favorite: boolean;
  muted: boolean;
  location_visible: boolean;
  note: string | null;
  updated_at: Timestamp;
};

export type ConnectionInvite = {
  id: UUID;
  inviter_id: UUID;
  token: UUID;
  code: string;
  expires_at: Timestamp;
  max_uses: number;
  use_count: number;
  revoked_at: Timestamp | null;
  created_at: Timestamp;
};

export type ConnectionCircle = {
  id: UUID;
  owner_id: UUID;
  name: string;
  emoji: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  memberIds: UUID[];
};

export type ParentPreview = {
  id: UUID;
  display_name: string;
  neighborhood: string | null;
  avatar_color: string;
  avatar_initials: string;
  avatar_url: string | null;
};

export type SuggestedConnection = ParentPreview & {
  mutual_count: number;
};

export type BlockedParent = ParentPreview & {
  blocked_at: Timestamp;
};

export type ConnectionInvitePreview = {
  found: boolean;
  active?: boolean;
  token?: UUID;
  code?: string;
  expires_at?: Timestamp;
  inviter?: ParentPreview;
};

export type ContactExchange = {
  connected: boolean;
  my_phone_set?: boolean;
  i_share?: boolean;
  they_share?: boolean;
  their_phone?: string | null;
};

export type ConnectionNotificationPreferences = {
  parent_id: UUID;
  connection_requests: boolean;
  connection_acceptances: boolean;
  invite_redemptions: boolean;
  plan_invitations: boolean;
  updated_at: Timestamp;
};

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'impersonation'
  | 'privacy'
  | 'unsafe_behavior'
  | 'other';
