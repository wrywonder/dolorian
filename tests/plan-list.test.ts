import assert from 'node:assert/strict';
import test from 'node:test';
import { isMyPlan, nextPlanSortTime } from '../src/lib/plan-list.ts';
import type { ActivitySocialProof } from '../src/types/views.ts';

function proof(overrides: Partial<ActivitySocialProof> = {}): ActivitySocialProof {
  return {
    activity: { id: 'plan', name: 'Soccer', created_by: 'host', starts_at: '2026-09-05T16:00:00Z', ends_at: '2026-10-31T17:00:00Z', all_day: false, schedule_kind: 'weekly', schedule_days: [6], schedule_timezone: 'America/Los_Angeles' } as ActivitySocialProof['activity'],
    venue: null, goingConnections: [], interestedConnections: [], outConnections: [], myState: null, myRsvpNote: null,
    ...overrides,
  };
}

test('My plans includes the sharer without pretending they registered', () => {
  const shared = proof();
  assert.equal(isMyPlan(shared, 'host'), true);
  assert.equal(shared.myState, null);
  assert.equal(isMyPlan(shared, 'friend'), false);
  assert.equal(isMyPlan(shared, null), false);
});

test('My plans includes going and considering but excludes declined or saved ideas', () => {
  for (const state of ['going', 'interested', 'attended'] as const) assert.equal(isMyPlan(proof({ myState: state }), 'friend'), true);
  for (const state of ['out', 'saved', 'skipped'] as const) assert.equal(isMyPlan(proof({ myState: state }), 'friend'), false);
});

test('a season sorts by its next session, with undated plans last', () => {
  const season = proof();
  const now = new Date('2026-09-12T18:00:00Z');
  assert.equal(nextPlanSortTime(season, now), Date.parse('2026-09-19T16:00:00Z'));
  const undated = proof({ activity: { ...season.activity, starts_at: null, ends_at: null } });
  assert.equal(nextPlanSortTime(undated, now), Number.POSITIVE_INFINITY);
});
