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
  /**
   * Author-chosen emoji that reactions on this post use. Null → the
   * default ❤️. Text on purpose: custom emoji can later be a storage
   * path or shortcode without a schema change.
   */
  reaction_emoji: string | null;
  created_at: Timestamp;
};

/** Default reaction emoji for posts whose author didn't pick one. */
export const DEFAULT_REACTION_EMOJI = '❤️';

export type PostReaction = {
  id: UUID;
  post_id: UUID;
  parent_id: UUID;
  emoji: string;
  created_at: Timestamp;
};

export type PostComment = {
  id: UUID;
  post_id: UUID;
  author_id: UUID;
  body: string;
  created_at: Timestamp;
};
