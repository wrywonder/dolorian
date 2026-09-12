import type { Activity } from '@/types';

export type PlanSchedule = Pick<Activity, 'starts_at' | 'ends_at' | 'schedule_kind' | 'schedule_days' | 'schedule_timezone'> & { all_day?: boolean };
export type PlanOccurrence = { dateKey: string; startsAt: string; endsAt: string | null };
export const MAX_PLAN_REPEAT_DAYS = 366;
const DAY_MS = 86_400_000;
const validTimeZones = new Set<string>();
const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isPlanTimeZone(value: string): boolean {
  if (!value || value.length > 100) return false;
  if (validTimeZones.has(value)) return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    if (validTimeZones.size >= 32) validTimeZones.clear();
    validTimeZones.add(value);
    return true;
  }
  catch { return false; }
}

function parts(date: Date, timezone?: string | null) {
  const zone = timezone || getDeviceTimeZone();
  let formatter = zonedFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    if (zonedFormatters.size >= 8) zonedFormatters.clear();
    zonedFormatters.set(zone, formatter);
  }
  const values = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute'), second: read('second') };
}

const pad = (value: number) => String(value).padStart(2, '0');

export function planDateKey(date: Date, timezone?: string | null): string {
  const value = parts(date, timezone);
  return `${String(value.year).padStart(4, '0')}-${pad(value.month)}-${pad(value.day)}`;
}

export function planClockTime(date: Date, timezone?: string | null): string {
  const value = parts(date, timezone);
  return `${pad(value.hour)}:${pad(value.minute)}`;
}

function dateKeyMillis(key: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Choose a valid date.');
  const date = new Date(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key) throw new Error('Choose a valid date.');
  return date.getTime();
}

export function addPlanDays(key: string, days: number): string {
  return new Date(dateKeyMillis(key) + days * DAY_MS).toISOString().slice(0, 10);
}

export function planWeekday(key: string): number {
  return new Date(dateKeyMillis(key)).getUTCDay();
}

/** Resolve wall time in its own zone, preserving clock times across DST.
 * Sample both sides of a transition; matching candidates disambiguate folds.
 * A nonexistent clock time is an error rather than a silently moved session.
 */
export function parsePlanDateTime(dateKey: string, time: string, allDay: boolean, timezone: string): string {
  dateKeyMillis(dateKey);
  if (!isPlanTimeZone(timezone)) throw new Error('Choose a valid time zone.');
  const clock = allDay ? '00:00' : time;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) throw new Error('Choose a time, or mark the plan as all day.');
  const wall = Date.parse(`${dateKey}T${clock}:00.000Z`);
  const offsets = new Set<number>();
  for (const delta of [-36, 0, 36]) {
    const instant = new Date(wall + delta * 3_600_000);
    const zoned = parts(instant, timezone);
    const asUtc = Date.parse(`${String(zoned.year).padStart(4, '0')}-${pad(zoned.month)}-${pad(zoned.day)}T${pad(zoned.hour)}:${pad(zoned.minute)}:${pad(zoned.second)}.000Z`);
    offsets.add(asUtc - instant.getTime());
  }
  const matches = [...offsets].map((offset) => new Date(wall - offset)).filter((candidate) =>
    planDateKey(candidate, timezone) === dateKey && planClockTime(candidate, timezone) === clock,
  ).sort((a, b) => a.getTime() - b.getTime());
  if (!matches[0]) throw new Error('That time does not exist on this date because the clocks change. Choose another time.');
  return matches[0].toISOString();
}

function validInstant(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid date.');
  return date;
}

/** New schedules are validated before saving and again by guarded SQL. */
export function validatePlanSchedule(plan: PlanSchedule): void {
  const start = validInstant(plan.starts_at);
  const end = validInstant(plan.ends_at);
  const kind = plan.schedule_kind;
  if (kind !== 'once' && kind !== 'weekly') throw new Error('Choose a valid schedule.');
  const timezone = plan.schedule_timezone;
  if (!timezone || !isPlanTimeZone(timezone)) throw new Error('Choose a valid time zone.');
  if (end && (!start || end < start || (!plan.all_day && end.getTime() === start.getTime()))) throw new Error('Choose an end after the start of the plan.');
  const days = plan.schedule_days ?? [];
  if (plan.all_day && [start, end].some((date) => date && parsePlanDateTime(planDateKey(date, timezone), '', true, timezone) !== date.toISOString())) {
    throw new Error('All-day dates must start at midnight in the plan time zone.');
  }
  if (kind === 'once') {
    if (days.length) throw new Error('Choose repeating days only for a repeating plan.');
    return;
  }
  if (!start || !end) throw new Error('Repeating plans need a first date and a final date.');
  if (!days.length || days.length > 7 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(days).size !== days.length) {
    throw new Error('Choose the days this plan repeats.');
  }
  const first = planDateKey(start, timezone);
  const last = planDateKey(end, timezone);
  if (dateKeyMillis(last) - dateKeyMillis(first) > MAX_PLAN_REPEAT_DAYS * DAY_MS) throw new Error('Choose a final date within one year of the first date.');
  if (!days.includes(planWeekday(first) as typeof days[number]) || !days.includes(planWeekday(last) as typeof days[number])) {
    throw new Error('The first and final dates must fall on one of the repeating days.');
  }
  const startTime = planClockTime(start, timezone);
  const endTime = planClockTime(end, timezone);
  if (!plan.all_day && endTime <= startTime) throw new Error('Each repeated session needs an end time after its start on the same day.');
  if (parsePlanDateTime(first, startTime, Boolean(plan.all_day), timezone) !== start.toISOString() || parsePlanDateTime(last, endTime, Boolean(plan.all_day), timezone) !== end.toISOString()) {
    throw new Error('Choose the first occurrence of that time when the clocks change, using whole minutes.');
  }
  for (let day = first; day <= last; day = addPlanDays(day, 1)) {
    if (!days.includes(planWeekday(day) as typeof days[number])) continue;
    parsePlanDateTime(day, startTime, Boolean(plan.all_day), timezone);
    parsePlanDateTime(day, endTime, Boolean(plan.all_day), timezone);
  }
}

/** Calendar date keys use the plan's zone; legacy plans use the device zone. */
export function scheduleDateKeys(plan: PlanSchedule): string[] {
  try {
    const start = validInstant(plan.starts_at);
    const end = validInstant(plan.ends_at) ?? start;
    if (!start || !end || end < start) return [];
    const first = planDateKey(start, plan.schedule_timezone);
    const last = planDateKey(end, plan.schedule_timezone);
    const keys: string[] = [];
    for (let cursor = first, count = 0; cursor <= last && count < 370; cursor = addPlanDays(cursor, 1), count++) {
      if (plan.schedule_kind !== 'weekly' || plan.schedule_days?.includes(planWeekday(cursor) as NonNullable<Activity['schedule_days']>[number])) keys.push(cursor);
    }
    return keys;
  } catch { return []; }
}

export function planOccurrenceOnDate(plan: PlanSchedule, dateKey: string): PlanOccurrence | null {
  if (!plan.starts_at) return null;
  const first = planDateKey(new Date(plan.starts_at), plan.schedule_timezone);
  const last = planDateKey(new Date(plan.ends_at ?? plan.starts_at), plan.schedule_timezone);
  if (dateKey < first || dateKey > last) return null;
  if (plan.schedule_kind === 'weekly' && !plan.schedule_days?.includes(planWeekday(dateKey) as NonNullable<Activity['schedule_days']>[number])) return null;
  if (plan.schedule_kind !== 'weekly') return { dateKey, startsAt: plan.starts_at, endsAt: plan.ends_at };
  const zone = plan.schedule_timezone;
  if (!zone || !plan.ends_at) return null;
  try {
    return {
      dateKey,
      startsAt: parsePlanDateTime(dateKey, planClockTime(new Date(plan.starts_at), zone), Boolean(plan.all_day), zone),
      endsAt: parsePlanDateTime(dateKey, planClockTime(new Date(plan.ends_at), zone), Boolean(plan.all_day), zone),
    };
  } catch { return null; }
}
