import type { ActivitySocialProof, UUID } from '@/types';
import { nextPlanOccurrence } from './plan-dates.ts';

/** Sharing an idea is enough to keep it in My plans; it does not imply an RSVP. */
export function isMyPlan(proof: ActivitySocialProof, parentId: UUID | null): boolean {
  return Boolean(parentId && proof.activity.created_by === parentId)
    || proof.myState === 'going'
    || proof.myState === 'interested'
    || proof.myState === 'attended';
}

export function nextPlanSortTime(proof: ActivitySocialProof, now: Date): number {
  if (!proof.activity.starts_at) return Number.POSITIVE_INFINITY;
  const next = nextPlanOccurrence(proof.activity, now);
  return Date.parse(next?.startsAt ?? proof.activity.starts_at);
}
