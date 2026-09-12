import assert from 'node:assert/strict';
import test from 'node:test';
import { planDateKeys, planDateLabel, planIsRecent, planIsUpcoming, planOccursOnDay, planTimeLabel } from '../src/lib/plan-dates.ts';

test('shows every day in a multi-day camp range on the Plans calendar', () => {
  const plan = {
    starts_at: new Date(2026, 7, 17, 8, 45).toISOString(),
    ends_at: new Date(2026, 7, 21, 15, 0).toISOString(),
  };
  assert.deepEqual(planDateKeys(plan), [
    '2026-08-17',
    '2026-08-18',
    '2026-08-19',
    '2026-08-20',
    '2026-08-21',
  ]);
  assert.equal(planOccursOnDay(plan, new Date(2026, 7, 20)), true);
  assert.equal(planOccursOnDay(plan, new Date(2026, 7, 22)), false);
});

test('keeps one-time plans on a single calendar day', () => {
  assert.deepEqual(planDateKeys({ starts_at: new Date(2026, 7, 20, 9).toISOString(), ends_at: null }), ['2026-08-20']);
});

test('keeps an all-day plan in Upcoming through its inclusive final day', () => {
  const oneDay = { starts_at: new Date(2026, 8, 8).toISOString(), ends_at: null, all_day: true };
  assert.equal(planIsUpcoming(oneDay, new Date(2026, 8, 8, 15)), true);
  assert.equal(planIsUpcoming(oneDay, new Date(2026, 8, 9)), false);
  const camp = { ...oneDay, ends_at: new Date(2026, 8, 11).toISOString() };
  assert.equal(planIsUpcoming(camp, new Date(2026, 8, 11, 23, 59)), true);
  assert.equal(planIsUpcoming(camp, new Date(2026, 8, 12)), false);
});

test('does not hide a plan with no end time the moment it starts', () => {
  const plan = { starts_at: new Date(2026, 8, 8, 10).toISOString(), ends_at: null, all_day: false };
  assert.equal(planIsUpcoming(plan, new Date(2026, 8, 8, 11)), true);
  assert.equal(planIsUpcoming(plan, new Date(2026, 8, 9)), false);
  assert.equal(planIsRecent(plan, new Date(2026, 8, 9)), true);
});

test('respects an explicit timed end and includes recently finished long camps', () => {
  const camp = { starts_at: new Date(2026, 5, 1, 9).toISOString(), ends_at: new Date(2026, 8, 8, 15).toISOString(), all_day: false };
  assert.equal(planIsUpcoming(camp, new Date(2026, 8, 8, 14)), true);
  assert.equal(planIsUpcoming(camp, new Date(2026, 8, 8, 16)), false);
  assert.equal(planIsRecent(camp, new Date(2026, 8, 9)), true);
  assert.equal(planIsRecent(camp, new Date(2026, 10, 1)), false);
});

test('all-day and range labels communicate the actual schedule', () => {
  const camp = { starts_at: new Date(2026, 8, 8).toISOString(), ends_at: new Date(2026, 8, 11).toISOString(), all_day: true };
  assert.equal(planTimeLabel(camp), 'all day');
  assert.equal(planDateLabel(camp), 'SEP 8–SEP 11');
  assert.equal(planDateLabel({ ...camp, ends_at: null }), 'TUE · SEP 8');
  assert.equal(planTimeLabel({ ...camp, all_day: false, starts_at: new Date(2026, 8, 8, 10).toISOString(), ends_at: new Date(2026, 8, 8, 12, 30).toISOString() }), '10am–12:30pm');
});

test('handles undated and invalid schedules without crashing or inventing dates', () => {
  assert.equal(planIsUpcoming({ starts_at: null, ends_at: null }, new Date()), true);
  assert.equal(planIsRecent({ starts_at: null, ends_at: null }, new Date()), false);
  assert.equal(planIsUpcoming({ starts_at: 'invalid', ends_at: null }, new Date()), false);
  assert.equal(planDateLabel({ starts_at: 'invalid', ends_at: null }), 'DATE TBD');
});
