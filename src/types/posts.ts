import type { Timestamp, UUID } from './common';
import type { LocationShareMode } from './venues';

export type PostType = 'photo' | 'question' | 'text';

export type Post = {
  id: UUID;
  author_id: UUID;
  type: PostType;
  body: string | null;
  media_path: string | null;
  activity_id: UUID | null;
  story_id: UUID | null;
  location_share_mode: LocationShareMode;
  venue_id: UUID | null;
  created_at: Timestamp;
};
