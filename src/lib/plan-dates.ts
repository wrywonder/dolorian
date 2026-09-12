import {
  addPlanDays,
  getDeviceTimeZone,
  parsePlanDateTime,
  planClockTime,
  planDateKey,
  planOccurrenceOnDate,
  scheduleDateKeys,
  type PlanOccurrence,
  type PlanSchedule,
} from './plan-schedule.ts';

function validDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date : null;
}

function zoneOptions(plan: PlanSchedule): Intl.DateTimeFormatOptions {
  return plan.schedule_timezone ? { timeZone: plan.schedule_timezone } : {};
}

function endOfPlanDay(date: Date, plan: PlanSchedule): Date {
  if (!plan.schedule_timezone) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  const day = planDateKey(date, plan.schedule_timezone);
  const nextDay = addPlanDays(day, 1);
  try {
    return new Date(Date.parse(parsePlanDateTime(nextDay, '', true, plan.schedule_timezone)) - 1);
  } catch (cause) {
    // Some zones advance at midnight, so tomorrow's 00:00 never exists. Find
    // the actual boundary rather than crashing a valid all-day plan today.
    // The second noon also covers a skipped calendar date at the date line.
    let after: number | undefined;
    for (const offset of [1, 2]) {
      try { after = Date.parse(parsePlanDateTime(addPlanDays(day, offset), '12:00', false, plan.schedule_timezone)); break; }
      catch { /* Try the next date if an entire calendar day was skipped. */ }
    }
    if (after === undefined) throw cause;
    let before = date.getTime();
    while (after - before > 1) {
      const middle = Math.floor((before + after) / 2);
      if (planDateKey(new Date(middle), plan.schedule_timezone) <= day) before = middle;
      else after = middle;
    }
    return new Date(after - 1);
  }
}

/** All-day ends are inclusive. An unspecified end keeps a plan on today's list. */
export function planEndDate(plan: PlanSchedule): Date | null {
  const start = validDate(plan.starts_at);
  if (!start) return null;
  const end = validDate(plan.ends_at) ?? start;
  return plan.all_day || !plan.ends_at ? endOfPlanDay(end, plan) : end;
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
  const options = zoneOptions(plan);
  const date = (value: Date, year = false) => new Intl.DateTimeFormat('en-US', { ...options, month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }).format(value);
  if (!end || planDateKey(start, plan.schedule_timezone) === planDateKey(end, plan.schedule_timezone)) {
    const weekday = new Intl.DateTimeFormat('en-US', { ...options, weekday: 'short' }).format(start);
    return `${weekday} · ${date(start)}`.toUpperCase();
  }
  const differentYears = planDateKey(start, plan.schedule_timezone).slice(0, 4) !== planDateKey(end, plan.schedule_timezone).slice(0, 4);
  return `${date(start, differentYears)}–${date(end, differentYears)}`.toUpperCase();
}

export function planTimeLabel(plan: PlanSchedule): string {
  if (!plan.starts_at) return 'time TBD';
  if (plan.all_day) return 'all day';
  const start = validDate(plan.starts_at);
  if (!start) return 'time TBD';
  const clock = (date: Date) => {
    const value = planClockTime(date, plan.schedule_timezone);
    const [hourText, minutes] = value.split(':');
    const hour = Number(hourText);
    return `${hour % 12 || 12}${minutes === '00' ? '' : `:${minutes}`}${hour >= 12 ? 'pm' : 'am'}`;
  };
  const end = validDate(plan.ends_at);
  const showEnd = end && (plan.schedule_kind === 'weekly' || planDateKey(start, plan.schedule_timezone) === planDateKey(end, plan.schedule_timezone));
  return showEnd ? `${clock(start)}–${clock(end)}` : clock(start);
}

export function planDateKeys(plan: PlanSchedule): string[] {
  return scheduleDateKeys(plan);
}

/** The calendar's day is a date selection, not an instant to convert to another zone. */
export function planOccursOnDay(plan: PlanSchedule, day: Date): boolean {
  return planDateKeys(plan).includes(planDateKey(day));
}

export function nextPlanOccurrence(plan: PlanSchedule, now: Date): PlanOccurrence | null {
  if (!plan.starts_at || !planIsUpcoming(plan, now)) return null;
  if (plan.schedule_kind !== 'weekly') {
    return { dateKey: planDateKey(new Date(plan.starts_at), plan.schedule_timezone), startsAt: plan.starts_at, endsAt: plan.ends_at };
  }
  const today = planDateKey(now, plan.schedule_timezone);
  for (const dateKey of planDateKeys(plan)) {
    if (dateKey < today) continue;
    const occurrence = planOccurrenceOnDate(plan, dateKey);
    if (occurrence && planIsUpcoming({ ...plan, starts_at: occurrence.startsAt, ends_at: occurrence.endsAt }, now)) return occurrence;
  }
  return null;
}

export function planScheduleLabel(plan: PlanSchedule): string {
  if (!validDate(plan.starts_at)) return 'Date to be decided';
  let repeat = '';
  if (plan.schedule_kind === 'weekly') {
    const days = [...(plan.schedule_days ?? [])].sort((a, b) => a - b);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    repeat = days.length === 7 ? 'Every day' : days.join(',') === '1,2,3,4,5' ? 'Weekdays' : days.map((day) => names[day]).join(', ');
    repeat += ' · ';
  }
  let timezone = '';
  if (plan.schedule_timezone && plan.schedule_timezone !== getDeviceTimeZone()) {
    // A season can cross daylight saving; naming the place avoids applying
    // the first session's PDT/PST abbreviation to the entire date range.
    const place = plan.schedule_timezone.split('/').pop()?.replaceAll('_', ' ') || plan.schedule_timezone;
    timezone = ` · ${place} time`;
  }
  const end = validDate(plan.ends_at);
  if (plan.schedule_kind !== 'weekly' && !plan.all_day && end && planDateKey(new Date(plan.starts_at!), plan.schedule_timezone) !== planDateKey(end, plan.schedule_timezone)) {
    const year = planDateKey(new Date(plan.starts_at!), plan.schedule_timezone).slice(0, 4) !== planDateKey(end, plan.schedule_timezone).slice(0, 4);
    const date = (iso: string) => new Intl.DateTimeFormat('en-US', { ...zoneOptions(plan), month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }).format(new Date(iso));
    const time = (iso: string) => planTimeLabel({ ...plan, starts_at: iso, ends_at: null });
    return `${date(plan.starts_at!)} · ${time(plan.starts_at!)} – ${date(plan.ends_at!)} · ${time(plan.ends_at!)}${timezone}`;
  }
  return `${repeat}${planDateLabel(plan)} · ${planTimeLabel(plan)}${timezone}`;
}
