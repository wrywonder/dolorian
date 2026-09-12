import type { Activity, PlanInput, PlanVisibility, PlanWeekday as Weekday } from '../types/activities.ts';
import type { UUID } from '../types/common.ts';
import { getPlanKind } from './plan-intent.ts';
import { addPlanDays, getDeviceTimeZone, parsePlanDateTime, planClockTime, planDateKey, planWeekday, validatePlanSchedule } from './plan-schedule.ts';

export type PlanEditorDraft = {
  name: string; description: string; emoji: string;
  sourceUrl: string; sourceKey: string; coverImageUrl: string;
  locationName: string; locationAddress: string;
  date: string; time: string; endDate: string; endTime: string; allDay: boolean;
  planKind: 'gathering' | 'signup'; repeating: boolean; days: Weekday[]; timezone: string;
  visibility: PlanVisibility; invitedIds: UUID[];
};

export function emptyPlanDraft(timezone = getDeviceTimeZone()): PlanEditorDraft {
  return {
    name: '', description: '', emoji: '✨', sourceUrl: '', sourceKey: '', coverImageUrl: '',
    locationName: '', locationAddress: '', date: '', time: '', endDate: '', endTime: '', allDay: false,
    planKind: 'gathering', repeating: false, days: [], timezone, visibility: 'connections', invitedIds: [],
  };
}

export function draftFromPlan(plan: Activity, invitedIds: UUID[], venueName?: string): PlanEditorDraft {
  const timezone = plan.schedule_timezone || getDeviceTimeZone();
  return {
    ...emptyPlanDraft(timezone), name: plan.name, description: plan.description || '', emoji: plan.emoji || '✨',
    sourceUrl: plan.external_url || '', sourceKey: plan.external_source_key || '', coverImageUrl: plan.cover_image_url || '',
    locationName: plan.location_name || venueName || '', locationAddress: plan.location_address || '',
    date: plan.starts_at ? planDateKey(new Date(plan.starts_at), timezone) : '',
    time: plan.starts_at ? planClockTime(new Date(plan.starts_at), timezone) : '',
    endDate: plan.ends_at ? planDateKey(new Date(plan.ends_at), timezone) : '',
    endTime: plan.ends_at ? planClockTime(new Date(plan.ends_at), timezone) : '',
    allDay: plan.all_day, planKind: getPlanKind(plan), repeating: plan.schedule_kind === 'weekly',
    days: plan.schedule_days || [], visibility: plan.visibility, invitedIds,
  };
}

export function clearPlanDate(draft: PlanEditorDraft): PlanEditorDraft {
  return { ...draft, date: '', time: '', endDate: '', endTime: '', allDay: false, repeating: false, days: [] };
}

/** Calendar arithmetic on date keys, independent of the device and DST. */
export const shiftPlanDate = addPlanDays;

export function weekdayForDate(date: string): Weekday {
  return planWeekday(date) as Weekday;
}

export function planInputFromDraft(draft: PlanEditorDraft): PlanInput {
  if (Array.from(draft.name.trim()).length < 2 || Array.from(draft.name.trim()).length > 140) throw new Error('Give your plan a name between 2 and 140 characters.');
  if (draft.visibility === 'invited' && draft.invitedIds.length === 0) throw new Error('Choose at least one friend.');
  let first = draft.date;
  let last = draft.endDate;
  if (first && draft.repeating) {
    if (!last) throw new Error('Choose the last date for this repeating plan.');
    if (!draft.days.length) throw new Error('Choose the days this plan repeats.');
    if (last < first) throw new Error('Choose a last date after the start.');
    if (last > shiftPlanDate(first, 366)) throw new Error('Keep repeating plans within one year.');
    // The entered range is a window. Store actual first/final sessions so old
    // clients also retain honest overall bounds.
    while (first <= last && !draft.days.includes(weekdayForDate(first))) first = shiftPlanDate(first, 1);
    while (last >= first && !draft.days.includes(weekdayForDate(last))) last = shiftPlanDate(last, -1);
    if (first > last) throw new Error('Choose a date range that includes a selected day.');
    if (!draft.allDay && !draft.endTime) throw new Error('Add the time each session ends.');
  }
  const input: PlanInput = {
    name: draft.name.trim(), description: draft.description.trim(), emoji: draft.emoji || '✨',
    starts_at: first ? parsePlanDateTime(first, draft.time, draft.allDay, draft.timezone) : null,
    ends_at: first && last ? parsePlanDateTime(last, draft.endTime || draft.time, draft.allDay, draft.timezone) : null,
    all_day: first ? draft.allDay : false,
    plan_kind: draft.planKind, schedule_kind: first && draft.repeating ? 'weekly' : 'once',
    schedule_days: first && draft.repeating ? [...draft.days].sort((a, b) => a - b) : [],
    schedule_timezone: draft.timezone,
    visibility: draft.visibility, invited_parent_ids: draft.visibility === 'invited' ? draft.invitedIds : [],
    location_name: draft.locationName.trim(), location_address: draft.locationAddress.trim(),
    external_url: draft.sourceUrl.trim(), external_source_key: draft.sourceKey, cover_image_url: draft.coverImageUrl,
  };
  validatePlanSchedule(input);
  return input;
}
