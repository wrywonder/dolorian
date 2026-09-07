import type { Activity } from '@/types';

function localDateKey(value: Date): string {
  return [
    String(value.getFullYear()).padStart(4, '0'),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export function planDateKeys(plan: Pick<Activity, 'starts_at' | 'ends_at'>): string[] {
  if (!plan.starts_at) return [];
  const start = new Date(plan.starts_at);
  const end = plan.ends_at ? new Date(plan.ends_at) : start;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys: string[] = [];
  while (cursor <= last && keys.length < 370) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function planOccursOnDay(plan: Pick<Activity, 'starts_at' | 'ends_at'>, day: Date): boolean {
  return planDateKeys(plan).includes(localDateKey(day));
}
