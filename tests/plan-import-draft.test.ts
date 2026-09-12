import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPlanLinkPreview, type PlanImportDraft } from '../src/lib/plan-import-draft.ts';
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
  const next = { ...preview, title: 'Music class', description: null, imageUrl: null, locationName: null, locationAddress: null, startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
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
