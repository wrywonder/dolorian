import assert from 'node:assert/strict';
import test from 'node:test';
import { clearPlanDate, draftFromPlan, emptyPlanDraft, planInputFromDraft } from '../src/lib/plan-editor-draft.ts';
import { planDateKeys } from '../src/lib/plan-dates.ts';
import type { Activity } from '../src/types/activities.ts';

test('an idea can be shared without inventing a date or a registration', () => {
  const input = planInputFromDraft({ ...emptyPlanDraft('America/Los_Angeles'), name: 'Pizza at ours', sourceUrl: 'https://example.com/invitation' });
  assert.equal(input.starts_at, null);
  assert.equal(input.ends_at, null);
  assert.equal(input.plan_kind, 'gathering');
  assert.equal(input.visibility, 'connections');
  assert.deepEqual(planDateKeys(input), []);
});

test('clearing a dated program removes the entire old schedule while keeping its useful details', () => {
  const draft = clearPlanDate({ ...emptyPlanDraft('America/Los_Angeles'), name: 'Camp idea', planKind: 'signup', date: '2026-07-06', time: '09:00', endDate: '2026-07-10', endTime: '15:00', allDay: true, repeating: true, days: [1, 2, 3, 4, 5], locationName: 'Garden camp', description: 'Looking at the older kids group' });
  const input = planInputFromDraft(draft);
  assert.equal(input.starts_at, null);
  assert.equal(input.ends_at, null);
  assert.equal(input.schedule_kind, 'once');
  assert.deepEqual(input.schedule_days, []);
  assert.equal(input.all_day, false);
  assert.equal(input.plan_kind, 'signup');
  assert.equal(input.location_name, 'Garden camp');
  assert.equal(input.description, 'Looking at the older kids group');
});

test('a weekday camp window saves actual sessions and daily hours', () => {
  const input = planInputFromDraft({ ...emptyPlanDraft('America/Los_Angeles'), name: 'Garden camp', planKind: 'signup', date: '2026-07-05', time: '09:00', endDate: '2026-07-11', endTime: '15:00', repeating: true, days: [1, 2, 3, 4, 5] });
  assert.equal(input.starts_at, '2026-07-06T16:00:00.000Z');
  assert.equal(input.ends_at, '2026-07-10T22:00:00.000Z');
  assert.deepEqual(planDateKeys(input), ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10']);
});

test('reopening a saved soccer season preserves its local hours while the viewer is elsewhere', () => {
  const input = planInputFromDraft({ ...emptyPlanDraft('America/Los_Angeles'), name: 'Soccer', date: '2026-10-24', time: '09:00', endDate: '2026-11-14', endTime: '10:00', repeating: true, days: [6] });
  const activity: Activity = { ...input, id: 'soccer', created_by: 'parent', created_at: '', updated_at: '', source: 'user_created', source_metadata: {}, confidence_score: null, published: true, venue_id: null, cancelled_at: null };
  const draft = draftFromPlan(activity, []);
  assert.equal(draft.date, '2026-10-24');
  assert.equal(draft.time, '09:00');
  assert.equal(draft.endDate, '2026-11-14');
  assert.equal(draft.endTime, '10:00');
  assert.equal(draft.timezone, 'America/Los_Angeles');
  assert.deepEqual(planInputFromDraft(draft), input);
});

test('a date without reliable hours must be completed or explicitly marked all-day', () => {
  const draft = { ...emptyPlanDraft('America/Los_Angeles'), name: 'Imported party', date: '2026-10-10' };
  assert.throws(() => planInputFromDraft(draft), /Choose a time/);
  assert.equal(planInputFromDraft({ ...draft, allDay: true }).starts_at, '2026-10-10T07:00:00.000Z');
});

test('invalid repeat windows and empty private audiences do not become plans', () => {
  const draft = { ...emptyPlanDraft('UTC'), name: 'Camp', date: '2026-07-06', time: '09:00', endDate: '2026-07-10', endTime: '15:00', repeating: true };
  assert.throws(() => planInputFromDraft(draft), /Choose the days/);
  assert.throws(() => planInputFromDraft({ ...draft, days: [6] }), /includes a selected day/);
  assert.throws(() => planInputFromDraft({ ...draft, days: [1], endDate: '2028-01-01' }), /one year/);
  assert.throws(() => planInputFromDraft({ ...emptyPlanDraft('UTC'), name: 'Private party', visibility: 'invited' }), /Choose at least one friend/);
});
