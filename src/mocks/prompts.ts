import type { Prompt } from '@/types';
import { ACTIVITY_IDS, PARENT_IDS, PROMPT_IDS } from './ids';

/**
 * 1 pending prompt — the ballet nudge shown in the Buzz design.
 * Triggered (in production) when Drew's geofence exits Studio Growlies
 * during a window where Drew had `state = 'going'` on the 10:30 Ballet.
 */
export const mockPrompts: Prompt[] = [
  {
    id: PROMPT_IDS.drew_ballet_share,
    parent_id: PARENT_IDS.drew,
    prompt_type: 'share_after_activity',
    payload: { activity_id: ACTIVITY_IDS.ten_thirty_ballet },
    state: 'pending',
    created_at: '2026-05-24T18:22:00Z',
    expires_at: '2026-05-25T18:22:00Z',
  },
];
