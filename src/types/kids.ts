import type { Timestamp, UUID } from './common';

export type Kid = {
  id: UUID;
  parent_id: UUID;
  name: string;
  birth_year: number;
  interests: string[];
  avatar_url: string | null;
  created_at: Timestamp;
};
