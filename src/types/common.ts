/** UUID string from Postgres uuid columns. */
export type UUID = string;

/** ISO 8601 timestamp string from timestamptz columns. */
export type Timestamp = string;

/** ISO date string (YYYY-MM-DD) from date columns. */
export type DateOnly = string;

import type { AvatarTone } from '@/lib/constants';

/** Map a parents.avatar_color value to one of our design tokens. */
export type AvatarColor = AvatarTone;
