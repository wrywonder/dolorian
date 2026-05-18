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
