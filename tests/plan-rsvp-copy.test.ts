import assert from 'node:assert/strict';
import test from 'node:test';
import { planRsvpCopy, planStateLabel } from '../src/lib/plan-rsvp-copy.ts';

test('uses registration language for formal external plans', () => {
  const copy = planRsvpCopy(true);
  assert.equal(copy.going, 'Signed up');
  assert.equal(copy.interested, 'Considering');
  assert.match(copy.detailsHelp, /child, days or weeks, times, group/i);
  assert.equal(planStateLabel('going', true), 'Signed up ✓');
});

test('keeps natural attendance language for informal plans', () => {
  const copy = planRsvpCopy(false);
  assert.equal(copy.going, 'Going');
  assert.equal(copy.interested, 'Interested');
  assert.equal(planStateLabel(null, false), "I'm in →");
});
