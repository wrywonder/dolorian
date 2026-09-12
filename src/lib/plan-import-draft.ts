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

/** Replace imported facts, clear stale imported facts, and retain manual details. */
export function applyPlanLinkPreview(
  current: PlanImportDraft,
  preview: PlanLinkPreview,
  previous: PlanLinkPreview | null,
): PlanImportDraft {
  const text = (value: string, next: string | null, old: string | null | undefined, empty = '') =>
    next || (old && value === old ? empty : value);
  return {
    name: text(current.name, preview.title, previous?.title),
    description: text(current.description, preview.description, previous?.description),
    emoji: text(current.emoji, preview.emoji, previous?.emoji, '✨'),
    locationName: text(current.locationName, preview.locationName, previous?.locationName),
    locationAddress: text(current.locationAddress, preview.locationAddress, previous?.locationAddress),
    coverImageUrl: text(current.coverImageUrl, preview.imageUrl, previous?.imageUrl),
    // Missing schedule facts must be chosen, never inherited from another listing.
    date: preview.startDate ?? '',
    time: preview.startTime ?? '',
    endDate: preview.endDate ?? '',
    endTime: preview.endTime ?? '',
    allDay: preview.allDay ?? false,
  };
}
