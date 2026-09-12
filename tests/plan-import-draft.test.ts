import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPlanLinkPreview, isSamePlanImportSource, type PlanImportDraft } from '../src/lib/plan-import-draft.ts';
import type { PlanLinkPreview } from '../src/types/activities.ts';

const draft: PlanImportDraft = {
  name: '', description: '', emoji: '✨', locationName: '', locationAddress: '', coverImageUrl: '',
  date: '2026-09-08', time: '10:00', endDate: '', endTime: '', allDay: false,
};
const preview: PlanLinkPreview = {
  url: 'https://example.com/camp', sourceKey: 'camp', title: 'Art camp', description: 'Paint all week',
  emoji: '🎨', locationName: 'Art studio', locationAddress: '123 Main St', imageUrl: 'https://example.com/art.jpg',
  startDate: '2026-09-08', startTime: '09:00', endDate: '2026-09-11', endTime: '15:00', allDay: false,
  importedFields: ['title', 'startDate'], inference: 'structured', warnings: [],
};

test('a second listing cannot inherit missing dates, locations, or images from the first', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const next = { ...preview, url: 'https://example.com/music', sourceKey: 'music', title: 'Music class', description: null, imageUrl: null, locationName: null, locationAddress: null, startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
  const result = applyPlanLinkPreview(first, next, preview);
  assert.equal(result.name, 'Music class');
  assert.equal(result.description, '');
  assert.equal(result.locationName, '');
  assert.equal(result.locationAddress, '');
  assert.equal(result.coverImageUrl, '');
  assert.equal(result.date, '');
  assert.equal(result.time, '');
  assert.equal(result.endDate, '');
  assert.equal(result.endTime, '');
  assert.equal(result.allDay, false);
});

test('reimport keeps useful manually edited details when the listing has none', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const manual = { ...first, locationName: 'Meet by the back gate', description: 'Carpool with us' };
  const result = applyPlanLinkPreview(manual, { ...preview, locationName: null, description: null }, preview);
  assert.equal(result.locationName, 'Meet by the back gate');
  assert.equal(result.description, 'Carpool with us');
});

test('a link with no schedule requires the user to choose a date instead of using tomorrow', () => {
  const result = applyPlanLinkPreview(draft, { ...preview, startDate: null, startTime: null, endDate: null, endTime: null }, null);
  assert.equal(result.date, '');
  assert.equal(result.time, '');
  assert.equal(result.endDate, '');
});

test('same-source reimport preserves edited or explicitly cleared facts', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const manual = { ...first, name: 'Art camp with our friends', description: 'Carpool with us', locationName: 'Meet by the back gate', locationAddress: '' };
  const result = applyPlanLinkPreview(manual, { ...preview, description: 'New organizer description', locationName: 'New studio wording', locationAddress: '456 Other St' }, preview);
  assert.equal(result.name, manual.name);
  assert.equal(result.description, manual.description);
  assert.equal(result.locationName, manual.locationName);
  assert.equal(result.locationAddress, '');
});

test('same-source reimport updates facts the parent has not changed', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const result = applyPlanLinkPreview(first, { ...preview, title: 'Renamed art camp', description: null, startTime: '10:00' }, preview);
  assert.equal(result.name, 'Renamed art camp');
  assert.equal(result.description, '');
  assert.equal(result.time, '10:00');
});

test('changing any schedule fact protects the whole same-source schedule', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const incoming = { ...preview, startDate: '2026-10-01', startTime: '10:00', endDate: null, endTime: null, allDay: true };
  for (const override of [{ date: '2026-09-09' }, { time: '09:30' }, { endDate: '2026-09-10' }, { endTime: '14:00' }, { allDay: true }]) {
    const manual = { ...first, ...override };
    const result = applyPlanLinkPreview(manual, incoming, preview);
    for (const key of ['date', 'time', 'endDate', 'endTime', 'allDay'] as const) assert.equal(result[key], manual[key]);
  }
});

test('same-source reimport never restores a date the parent cleared', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const manual = { ...first, date: '', time: '', endDate: '', endTime: '', allDay: false };
  const result = applyPlanLinkPreview(manual, preview, preview);
  assert.equal(result.date, '');
  assert.equal(result.time, '');
  assert.equal(result.endDate, '');
  assert.equal(result.endTime, '');
});

test('same-source repeats keep their bounds even when they matched the prior listing', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const incoming = { ...preview, startDate: '2026-10-01', endDate: '2026-10-30', startTime: '12:00', endTime: '18:00' };
  const result = applyPlanLinkPreview(first, incoming, preview, { preserveSchedule: true });
  assert.equal(result.date, first.date);
  assert.equal(result.time, first.time);
  assert.equal(result.endDate, first.endDate);
  assert.equal(result.endTime, first.endTime);
});

test('a different listing cannot inherit manual repeat bounds or missing imported facts', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const manual = { ...first, description: 'Carpool with us', time: '09:30', endDate: '2026-10-01' };
  const incoming = { ...preview, url: 'https://example.com/soccer', sourceKey: 'soccer', title: 'Soccer', description: null, startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
  assert.equal(isSamePlanImportSource(preview, incoming), false);
  const result = applyPlanLinkPreview(manual, incoming, preview, { preserveSchedule: true });
  assert.equal(result.name, 'Soccer');
  assert.equal(result.description, 'Carpool with us');
  assert.equal(result.date, '');
  assert.equal(result.time, '');
  assert.equal(result.endDate, '');
  assert.equal(result.endTime, '');
});

test('editing a saved matching plan preserves existing facts without an import cache', () => {
  const existing = { ...draft, name: 'Leo’s soccer', description: 'Our Saturday crew', locationName: 'Back field', locationAddress: '', date: '', time: '' };
  const result = applyPlanLinkPreview(existing, preview, null, { preserveExisting: true });
  assert.equal(result.name, existing.name);
  assert.equal(result.description, existing.description);
  assert.equal(result.locationName, existing.locationName);
  assert.equal(result.locationAddress, preview.locationAddress);
  assert.equal(result.date, '');
  assert.equal(result.time, '');
  assert.equal(result.endDate, '');
});

test('source identity uses stable keys or the same URL but never matches a different session query', () => {
  assert.equal(isSamePlanImportSource(preview, { ...preview, url: 'https://example.com/camp?tracking=1' }), true);
  assert.equal(isSamePlanImportSource({ url: 'https://EXAMPLE.com/camp#registration', sourceKey: '' }, preview), true);
  assert.equal(isSamePlanImportSource({ url: 'https://example.com/camp?week=1', sourceKey: 'week-1' }, { url: 'https://example.com/camp?week=2', sourceKey: 'week-2' }), false);
  assert.equal(isSamePlanImportSource(null, preview), false);
  assert.equal(isSamePlanImportSource({ url: '', sourceKey: '' }, { url: '', sourceKey: '' }), false);
});

test('saved-plan mode uses previous import comparison after a reread, including cleared values', () => {
  const first = applyPlanLinkPreview(draft, preview, null, { preserveExisting: true });
  const cleared = { ...first, description: '', locationAddress: '' };
  const result = applyPlanLinkPreview(cleared, preview, preview, { preserveExisting: true });
  assert.equal(result.description, '');
  assert.equal(result.locationAddress, '');
});

test('an explicit saved-plan clear stays empty on its first reread while untouched blanks can fill', () => {
  const existing = { ...draft, name: 'Our camp', description: '', locationAddress: '', coverImageUrl: '' };
  const result = applyPlanLinkPreview(existing, preview, null, { preserveExisting: true, ownedTextFields: new Set(['description', 'locationAddress']) });
  assert.equal(result.description, '');
  assert.equal(result.locationAddress, '');
  assert.equal(result.coverImageUrl, preview.imageUrl);
  assert.equal(result.name, 'Our camp');
});

test('owned clears survive a null provider response between rereads', () => {
  const options = { preserveExisting: true, ownedTextFields: new Set(['description', 'locationAddress'] as const) };
  const first = applyPlanLinkPreview(draft, preview, null, { preserveExisting: true });
  const cleared = { ...first, description: '', locationAddress: '' };
  const missing = { ...preview, description: null, locationAddress: null };
  const second = applyPlanLinkPreview(cleared, missing, preview, options);
  const third = applyPlanLinkPreview(second, preview, missing, options);
  assert.equal(third.description, '');
  assert.equal(third.locationAddress, '');
});

test('an explicitly cleared new-draft schedule stays undated through a missing then restored provider schedule', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const cleared = { ...first, date: '', time: '', endDate: '', endTime: '', allDay: false };
  const missing = { ...preview, startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
  const second = applyPlanLinkPreview(cleared, missing, preview, { preserveSchedule: true });
  const third = applyPlanLinkPreview(second, preview, missing, { preserveSchedule: true });
  for (const key of ['date', 'time', 'endDate', 'endTime'] as const) assert.equal(third[key], '');
  assert.equal(third.allDay, false);
});

test('saved nonempty owned facts stay protected when they coincided with imported text', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const result = applyPlanLinkPreview(first, { ...preview, description: 'Changed by organizer' }, preview, { preserveExisting: true, ownedTextFields: new Set(['description']) });
  assert.equal(result.description, first.description);
});

test('text ownership from a previous listing does not prevent a different listing from filling its facts', () => {
  const first = applyPlanLinkPreview(draft, preview, null);
  const incoming = { ...preview, sourceKey: 'new-camp', url: 'https://example.com/new-camp', description: 'A different camp' };
  const result = applyPlanLinkPreview({ ...first, description: '' }, incoming, preview, { ownedTextFields: new Set(['description']) });
  assert.equal(result.description, 'A different camp');
});
