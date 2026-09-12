import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlanKind } from '../src/lib/plan-intent.ts';
import { parsePlanDateTime, planOccurrenceOnDate, planDateKey, validatePlanSchedule, type PlanSchedule } from '../src/lib/plan-schedule.ts';
import { nextPlanOccurrence, planDateKeys, planEndDate, planIsUpcoming, planScheduleLabel, planTimeLabel } from '../src/lib/plan-dates.ts';

const zone = 'America/Los_Angeles';
const at = (day: string, time = '09:00') => parsePlanDateTime(day, time, false, zone);
const weekly = (overrides: Partial<PlanSchedule> = {}): PlanSchedule => ({
  starts_at: at('2026-10-31'), ends_at: at('2026-11-14', '10:00'),
  all_day: false, schedule_kind: 'weekly', schedule_days: [6], schedule_timezone: zone,
  ...overrides,
});

test('explicit intent wins over links and missing links; legacy inference remains compatible', () => {
  assert.equal(getPlanKind({ plan_kind: 'gathering', external_url: 'https://example.com/party' }), 'gathering');
  assert.equal(getPlanKind({ plan_kind: 'signup', external_url: null }), 'signup');
  assert.equal(getPlanKind({ external_url: 'https://example.com/camp' }), 'signup');
  assert.equal(getPlanKind({ plan_kind: null, external_url: null }), 'gathering');
});

test('a shared idea can have Date TBD but cannot retain a stale end', () => {
  assert.doesNotThrow(() => validatePlanSchedule(weekly({ starts_at: null, ends_at: null, schedule_kind: 'once', schedule_days: [] })));
  assert.throws(() => validatePlanSchedule(weekly({ starts_at: null, schedule_kind: 'once', schedule_days: [] })), /end after the start/);
  assert.equal(nextPlanOccurrence({ starts_at: null, ends_at: null }, new Date()), null);
});

test('Saturday soccer stays Saturday at 9 across fall DST and sorts by its next session', () => {
  const plan = weekly();
  validatePlanSchedule(plan);
  assert.deepEqual(planDateKeys(plan), ['2026-10-31', '2026-11-07', '2026-11-14']);
  assert.equal(plan.starts_at, '2026-10-31T16:00:00.000Z');
  const next = nextPlanOccurrence(plan, new Date('2026-11-01T12:00:00Z'));
  assert.equal(next?.startsAt, '2026-11-07T17:00:00.000Z');
  assert.equal(next?.endsAt, '2026-11-07T18:00:00.000Z');
  assert.equal(planOccurrenceOnDate(plan, '2026-11-08'), null);
  assert.equal(planTimeLabel(plan), '9am–10am');
  assert.match(planScheduleLabel(plan), /^Sat · OCT 31–NOV 14 · 9am–10am/);
});

test('weekday camps mark chosen days and keep each daily pickup time', () => {
  const camp = weekly({ starts_at: at('2026-06-15'), ends_at: at('2026-06-26', '15:00'), schedule_days: [1, 2, 3, 4, 5] });
  validatePlanSchedule(camp);
  assert.equal(planDateKeys(camp).length, 10);
  assert.equal(planDateKeys(camp).includes('2026-06-20'), false);
  assert.equal(planOccurrenceOnDate(camp, '2026-06-23')?.endsAt, '2026-06-23T22:00:00.000Z');
  assert.match(planScheduleLabel(camp), /^Weekdays/);
});

test('all-day repeats retain their local dates and inclusive final day', () => {
  const plan = weekly({ starts_at: at('2026-03-07', '00:00'), ends_at: at('2026-03-09', '00:00'), all_day: true, schedule_days: [0, 1, 2, 3, 4, 5, 6] });
  validatePlanSchedule(plan);
  assert.deepEqual(planDateKeys(plan), ['2026-03-07', '2026-03-08', '2026-03-09']);
  assert.equal(planIsUpcoming(plan, new Date('2026-03-10T06:59:59Z')), true);
  assert.equal(planIsUpcoming(plan, new Date('2026-03-10T07:00:00Z')), false);
  assert.equal(planDateKey(new Date(plan.starts_at!), 'Asia/Tokyo'), '2026-03-07');
  assert.throws(() => validatePlanSchedule({ ...plan, starts_at: at('2026-03-07', '09:00') }), /midnight/);
});

test('wall-clock parsing rejects invalid dates/gaps and consistently resolves folds', () => {
  assert.throws(() => at('2026-02-30'), /valid date/);
  assert.throws(() => at('2026-03-08', '02:30'), /clocks change/);
  assert.equal(at('2026-11-01', '01:30'), '2026-11-01T08:30:00.000Z');
  assert.equal(parsePlanDateTime('2026-09-01', '09:00', false, 'Asia/Kolkata'), '2026-09-01T03:30:00.000Z');
  assert.throws(() => parsePlanDateTime('2026-09-01', '09:00', false, 'Not/AZone'), /time zone/);
});

test('rejects weekly schedules that would skip a session in a spring clock gap', () => {
  assert.throws(() => validatePlanSchedule(weekly({ starts_at: at('2026-03-01', '02:30'), ends_at: at('2026-03-15', '03:30'), schedule_days: [0] })), /clocks change/);
});

test('repeats require a bounded window, selected boundary days, and daily end time', () => {
  assert.throws(() => validatePlanSchedule(weekly({ ends_at: null })), /first date and a final date/);
  assert.throws(() => validatePlanSchedule(weekly({ schedule_days: [6, 6] })), /days this plan repeats/);
  assert.throws(() => validatePlanSchedule(weekly({ ends_at: at('2026-11-15', '10:00') })), /first and final dates/);
  assert.throws(() => validatePlanSchedule(weekly({ ends_at: at('2028-11-18', '10:00') })), /within one year/);
  assert.throws(() => validatePlanSchedule(weekly({ ends_at: at('2026-11-14', '08:00') })), /same day/);
});

test('one-time house weekends and legacy ranges keep contiguous semantics', () => {
  const weekend = weekly({ starts_at: at('2026-11-06', '18:00'), ends_at: at('2026-11-08', '11:00'), schedule_kind: 'once', schedule_days: [] });
  validatePlanSchedule(weekend);
  assert.deepEqual(planDateKeys(weekend), ['2026-11-06', '2026-11-07', '2026-11-08']);
  const legacy = { starts_at: new Date(2026, 10, 6, 18).toISOString(), ends_at: new Date(2026, 10, 8, 11).toISOString() };
  assert.deepEqual(planDateKeys(legacy), ['2026-11-06', '2026-11-07', '2026-11-08']);
});

test('a house weekend labels both arrival and checkout while explicit zero-duration plans are rejected', () => {
  const trip = weekly({ starts_at: at('2026-09-19', '16:00'), ends_at: at('2026-09-20', '11:00'), schedule_kind: 'once', schedule_days: [] });
  assert.match(planScheduleLabel(trip), /^Sep 19 · 4pm – Sep 20 · 11am/);
  assert.throws(() => validatePlanSchedule({ ...trip, ends_at: trip.starts_at }), /end after the start/);
  assert.doesNotThrow(() => validatePlanSchedule({ ...trip, starts_at: at('2026-09-19', '00:00'), ends_at: at('2026-09-19', '00:00'), all_day: true }));
});

test('a valid all-day plan remains readable when the following midnight is skipped', () => {
  const plan = { starts_at: parsePlanDateTime('2026-04-23', '', true, 'Africa/Cairo'), ends_at: null, all_day: true, schedule_kind: 'once' as const, schedule_days: [], schedule_timezone: 'Africa/Cairo' };
  validatePlanSchedule(plan);
  assert.equal(planEndDate(plan)?.toISOString(), '2026-04-23T21:59:59.999Z');
  assert.equal(planIsUpcoming(plan, new Date('2026-04-23T22:00:00Z')), false);
});
