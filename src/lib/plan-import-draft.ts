import type { PlanLinkPreview } from '@/types';

export type PlanImportDraft = {
  name: string;
  description: string;
  emoji: string;
  locationName: string;
  locationAddress: string;
  coverImageUrl: string;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
};

type PlanImportSource = { url: string; sourceKey: string };
export const PLAN_IMPORT_TEXT_FIELDS = ['name', 'description', 'emoji', 'locationName', 'locationAddress', 'coverImageUrl'] as const;
export type PlanImportTextField = typeof PLAN_IMPORT_TEXT_FIELDS[number];
type PlanImportOptions = {
  /** An edited, saved plan has no in-memory import history. Its facts are user-owned. */
  preserveExisting?: boolean;
  /** Explicit repeat controls belong to the parent, even when the dates match the listing. */
  preserveSchedule?: boolean;
  /** Keep explicit edits, including empty values, through repeated same-source reads. */
  ownedTextFields?: ReadonlySet<PlanImportTextField>;
};

export function isSamePlanImportSource(source: PlanImportSource | null, preview: PlanImportSource): boolean {
  if (!source) return false;
  if (source.sourceKey && source.sourceKey === preview.sourceKey) return true;
  if (!source.url.trim() || !preview.url.trim()) return false;
  try {
    const oldUrl = new URL(source.url.trim());
    const newUrl = new URL(preview.url.trim());
    oldUrl.hash = ''; newUrl.hash = '';
    return oldUrl.href === newUrl.href;
  } catch { return source.url.trim() === preview.url.trim(); }
}

/** Replace imported facts, clear stale imported facts, and retain manual details. */
export function applyPlanLinkPreview(
  current: PlanImportDraft,
  preview: PlanLinkPreview,
  previous: PlanLinkPreview | null,
  options: PlanImportOptions = {},
): PlanImportDraft {
  const sameSource = Boolean(options.preserveExisting) || isSamePlanImportSource(previous, preview);
  const text = (field: PlanImportTextField, next: string | null, old: string | null | undefined, empty = '') => {
    const value = current[field];
    const changed = previous ? value !== (old ?? empty) : options.preserveExisting ? Boolean(value) : value !== (old ?? empty);
    if (sameSource && (options.ownedTextFields?.has(field) || changed)) return value;
    return next || (old && value === old ? empty : value);
  };
  const oldSchedule = {
    date: previous?.startDate ?? '', time: previous?.startTime ?? '',
    endDate: previous?.endDate ?? '', endTime: previous?.endTime ?? '', allDay: previous?.allDay ?? false,
  };
  // A schedule is one decision. Mixing a manually chosen day with a newly
  // imported time (or restoring an explicitly cleared date) would invent facts.
  const changedSchedule = current.date !== oldSchedule.date || current.time !== oldSchedule.time
    || current.endDate !== oldSchedule.endDate || current.endTime !== oldSchedule.endTime
    || current.allDay !== oldSchedule.allDay;
  const keepSchedule = sameSource && (options.preserveExisting || options.preserveSchedule || changedSchedule);
  return {
    name: text('name', preview.title, previous?.title),
    description: text('description', preview.description, previous?.description),
    emoji: text('emoji', preview.emoji, previous?.emoji, '✨'),
    locationName: text('locationName', preview.locationName, previous?.locationName),
    locationAddress: text('locationAddress', preview.locationAddress, previous?.locationAddress),
    coverImageUrl: text('coverImageUrl', preview.imageUrl, previous?.imageUrl),
    // Missing schedule facts from a different listing must be chosen again.
    date: keepSchedule ? current.date : preview.startDate ?? '',
    time: keepSchedule ? current.time : preview.startTime ?? '',
    endDate: keepSchedule ? current.endDate : preview.endDate ?? '',
    endTime: keepSchedule ? current.endTime : preview.endTime ?? '',
    allDay: keepSchedule ? current.allDay : preview.allDay ?? false,
  };
}
