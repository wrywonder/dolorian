import assert from 'node:assert/strict';
import test from 'node:test';
import { planRsvpCopy, planStateLabel } from '../src/lib/plan-rsvp-copy.ts';

test('uses registration language for formal external plans', () => {
  const copy = planRsvpCopy('signup');
  assert.equal(copy.going, 'Signed up');
  assert.equal(copy.interested, 'Considering');
  assert.match(copy.detailsHelp, /child, days or weeks, times, group/i);
  assert.equal(planStateLabel('going', 'signup'), 'Signed up ✓');
});

test('keeps natural attendance language for informal plans', () => {
  const copy = planRsvpCopy('gathering');
  assert.equal(copy.going, 'Going');
  assert.equal(copy.interested, 'Maybe');
  assert.equal(planStateLabel(null, 'gathering'), 'Respond →');
});

test('uncommitted and skipped plans invite a response without asserting attendance', () => {
  for (const kind of ['gathering', 'signup'] as const) {
    assert.equal(planStateLabel(null, kind), 'Respond →');
    assert.equal(planStateLabel('saved', kind), 'Respond →');
    assert.equal(planStateLabel('skipped', kind), 'Respond →');
  }
});

test('confirmed states keep their gathering or signup meaning', () => {
  assert.equal(planStateLabel('attended', 'gathering'), 'Going ✓');
  assert.equal(planStateLabel('interested', 'gathering'), 'Maybe');
  assert.equal(planStateLabel('interested', 'signup'), 'Considering');
  assert.equal(planStateLabel('out', 'gathering'), 'Can’t make it');
  assert.equal(planStateLabel('out', 'signup'), 'Not this time');
});
