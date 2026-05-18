/**
 * Enriched view types — shapes the data layer joins together for the UI.
 * Screens import these instead of the raw rows when they need related data.
 */

import type { Activity, InteractionState } from './activities';
import type { ConnectionStatus } from './connections';
import type { Kid } from './kids';
import type { Parent } from './parents';
import type { Post } from './posts';
import type { Prompt, PromptType } from './prompts';
import type { ParentLocation, Venue } from './venues';

export type FeedItem = {
  post: Post;
  author: Parent;
  activity: Activity | null;
  venue: Venue | null;
};

export type ActivitySocialProof = {
  activity: Activity;
  venue: Venue | null;
  /** Connected parents who are 'interested'. Excludes the current user. */
  interestedConnections: Parent[];
  /** Connected parents who are 'going'. Excludes the current user. */
  goingConnections: Parent[];
  /** Current user's own state for this activity, if any. */
  myState: InteractionState | null;
};

export type NearbyParent = {
  parent: Parent;
  location: ParentLocation;
  venue: Venue | null;
};

export type ProfileView = {
  parent: Parent;
  kids: Kid[];
  /** Connection between current user and this parent, if any. */
  connectionStatus: ConnectionStatus | 'none';
  /** Coarse count for "X mutual friends" — shared connections. */
  mutualFriendCount: number;
  /** Activity chips — venue names from activities they've engaged with. */
  activityChips: string[];
};

export type ResolvedPrompt<T extends PromptType = PromptType> = {
  prompt: Prompt<T>;
  /** Resolved entities relevant to the prompt type, eagerly attached. */
  activity?: Activity | null;
  venue?: Venue | null;
  signalFrom?: Parent | null;
};
