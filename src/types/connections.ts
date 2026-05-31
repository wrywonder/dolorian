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

/**
 * A pending connection request shown in the You-tab inbox. Flattened from
 * the get_incoming_requests() RPC, which joins the inviter's parent row so
 * we can render their name/avatar before the edge is connected.
 */
export type IncomingRequest = {
  connection_id: UUID;
  parent_id: UUID;
  display_name: string;
  neighborhood: string | null;
  avatar_color: string;
  avatar_initials: string;
  created_at: Timestamp;
};

/** Outcome of send_invite() — drives the invite screen's success copy. */
export type InviteOutcome = 'request_sent' | 'already_connected' | 'invited';

/**
 * A still-pending thing I've sent, from get_outgoing_requests(). Either a
 * connection request to a parent already on the app ('request'), or an invite
 * to a contact handle for someone who hasn't joined yet ('invite').
 */
export type OutgoingRequest = {
  kind: 'request' | 'invite';
  /** connection_id when kind='request', invite_id when kind='invite'. */
  id: UUID;
  parent_id: UUID | null;
  display_name: string | null;
  neighborhood: string | null;
  avatar_color: string | null;
  avatar_initials: string | null;
  /** Email/phone the invite was sent to (kind='invite' only). */
  handle: string | null;
  created_at: Timestamp;
};
