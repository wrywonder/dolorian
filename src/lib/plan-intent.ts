import type { Activity, PlanKind } from '@/types';

/** A useful link does not turn a gathering into a registration. */
export function getPlanKind(plan: Pick<Activity, 'external_url' | 'plan_kind'>): PlanKind {
  return plan.plan_kind ?? (plan.external_url ? 'signup' : 'gathering');
}
