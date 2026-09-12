import { format } from 'date-fns';
import type { Activity } from '@/types';

type PlanSchedule = Pick<Activity, 'starts_at' | 'ends_at'> & { all_day?: boolean };

function validDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** All-day ends are inclusive. An unspecified end keeps a plan on today's list. */
export function planEndDate(plan: PlanSchedule): Date | null {
  const start = validDate(plan.starts_at);
  if (!start) return null;
  const end = validDate(plan.ends_at) ?? new Date(start);
  if (plan.all_day || !plan.ends_at) end.setHours(23, 59, 59, 999);
  return end;
}

export function planIsUpcoming(plan: PlanSchedule, now: Date): boolean {
  if (!plan.starts_at) return true;
  const end = planEndDate(plan);
  return end !== null && end >= now;
}

export function planIsRecent(plan: PlanSchedule, now: Date, days = 45): boolean {
  const end = planEndDate(plan);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return end !== null && end < now && end >= cutoff;
}

export function planDateLabel(plan: PlanSchedule): string {
  const start = validDate(plan.starts_at);
  if (!start) return 'DATE TBD';
  const end = validDate(plan.ends_at);
  if (!end || localDateKey(start) === localDateKey(end)) return format(start, 'EEE · MMM d').toUpperCase();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = format(start, sameYear ? 'MMM d' : 'MMM d, yyyy');
  const endLabel = format(end, sameYear ? 'MMM d' : 'MMM d, yyyy');
  return `${startLabel}–${endLabel}`.toUpperCase();
}

export function planTimeLabel(plan: PlanSchedule): string {
  if (plan.all_day) return 'all day';
  const start = validDate(plan.starts_at);
  if (!start) return 'time TBD';
  const time = (date: Date) => format(date, date.getMinutes() === 0 ? 'ha' : 'h:mma').toLowerCase();
  const end = validDate(plan.ends_at);
  return end && localDateKey(start) === localDateKey(end)
    ? `${time(start)}–${time(end)}`
    : time(start);
}

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
