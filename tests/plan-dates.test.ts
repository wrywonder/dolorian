import assert from 'node:assert/strict';
import test from 'node:test';
import { planDateKeys, planOccursOnDay } from '../src/lib/plan-dates.ts';

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
