import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTO_SHARE_DELAY_MS, VISIT_DURATION_MS, createPresenceIdentityGuard, createPresenceQueue, hasActiveVisit, isHangoutMonitoringOwner, isPresenceVisible, replaceOwnedHangoutMonitoring, startWarnedVisit, visitTimes } from '../src/lib/irl-presence.ts';

const now = Date.parse('2026-09-08T12:00:00.000Z');

test('a manual visit is visible immediately, expires after two hours, and never has an auto countdown', () => {
  const location = { venue_id: 'park', visible: true, ...visitTimes(now) };
  assert.equal(location.auto_share_at, null);
  assert.equal(isPresenceVisible(location, now), true);
  assert.equal(isPresenceVisible(location, now + VISIT_DURATION_MS - 1), true);
  assert.equal(isPresenceVisible(location, now + VISIT_DURATION_MS), false);
  assert.equal(hasActiveVisit(location, now + VISIT_DURATION_MS), false);
});

test('a pending automatic visit is hidden until the five-minute boundary', () => {
  const location = { venue_id: 'park', visible: false, ...visitTimes(now, true) };
  assert.equal(hasActiveVisit(location, now), true);
  assert.equal(isPresenceVisible(location, now + AUTO_SHARE_DELAY_MS - 1), false);
  assert.equal(isPresenceVisible(location, now + AUTO_SHARE_DELAY_MS), true);
  assert.equal(isPresenceVisible(location, now + VISIT_DURATION_MS), false);
});

test('missing places and absent, invalid or expired times cannot appear live', () => {
  for (const expires_at of [null, 'not-a-date', new Date(now - 1).toISOString()]) {
    assert.equal(isPresenceVisible({ venue_id: 'park', visible: true, auto_share_at: null, expires_at }, now), false);
  }
  assert.equal(hasActiveVisit(null, now), false);
  assert.equal(isPresenceVisible({ venue_id: null, visible: true, ...visitTimes(now) }, now), false);
});

test('a failed warning prevents the automatic share from ever being written', async () => {
  let writes = 0;
  await assert.rejects(startWarnedVisit(
    async () => { throw new Error('Notifications denied'); },
    async () => { writes += 1; },
    async () => {},
  ), /Notifications denied/);
  assert.equal(writes, 0);
});

test('warning succeeds before persistence and is cancelled when the write fails', async () => {
  const events: string[] = [];
  await assert.rejects(startWarnedVisit(
    async () => { events.push('warning'); },
    async () => { events.push('write'); throw new Error('Offline'); },
    async () => { events.push('cancel'); },
  ), /Offline/);
  assert.deepEqual(events, ['warning', 'write', 'cancel']);
});

test('an arrival already in flight cannot finish after a later stop', async () => {
  const run = createPresenceQueue();
  let finishArrival: () => void = () => {};
  const arrivalGate = new Promise<void>((resolve) => { finishArrival = resolve; });
  let visible = false;
  const arrival = run(async () => { await arrivalGate; visible = true; });
  const stop = run(async () => { visible = false; });
  finishArrival();
  await Promise.all([arrival, stop]);
  assert.equal(visible, false);
});

test('a failed presence operation does not block a later stop or retry', async () => {
  const run = createPresenceQueue();
  await assert.rejects(run(async () => { throw new Error('Offline'); }), /Offline/);
  assert.equal(await run(async () => 'stopped'), 'stopped');
});


test('same-account token refresh preserves state but sign-out rejects pending presence work', () => {
  const identity = createPresenceIdentityGuard();
  assert.equal(identity.update('parent-a'), true);
  const pendingRead = identity.capture();
  assert.equal(identity.update('parent-a'), false);
  assert.equal(pendingRead(), true);
  assert.equal(identity.update(null), true);
  assert.equal(pendingRead(), false);
});

test("a different account cannot receive the old account's late share or stop result", () => {
  const identity = createPresenceIdentityGuard();
  identity.update('parent-a');
  const pendingShare = identity.capture();
  assert.equal(identity.update('parent-b'), true);
  assert.equal(pendingShare(), false);
  assert.equal(identity.capture()(), true);
});


test('automatic monitoring cannot carry across accounts or use an unowned old registration', () => {
  assert.equal(isHangoutMonitoringOwner('parent-a', 'parent-a'), true);
  assert.equal(isHangoutMonitoringOwner('parent-a', 'parent-b'), false);
  assert.equal(isHangoutMonitoringOwner(null, 'parent-b'), false);
  assert.equal(isHangoutMonitoringOwner('parent-a', null), false);
});


test('failed region replacement leaves stale regions without an authorized owner', async () => {
  let owner: string | null = 'parent-a';
  await assert.rejects(replaceOwnedHangoutMonitoring({
    clearOwner: async () => { owner = null; },
    isSameAccount: async () => true,
    replaceRegions: async () => { throw new Error('Registration failed'); },
    claimOwner: async () => { owner = 'parent-b'; },
  }), /Registration failed/);
  assert.equal(owner, null);
});

test('account change during registration never grants its regions to the new account', async () => {
  let owner: string | null = 'parent-a';
  let sameAccount = true;
  await assert.rejects(replaceOwnedHangoutMonitoring({
    clearOwner: async () => { owner = null; },
    isSameAccount: async () => sameAccount,
    replaceRegions: async () => { sameAccount = false; },
    claimOwner: async () => { owner = 'parent-a'; },
  }), /account changed/);
  assert.equal(owner, null);
});

test("a stale setup request cannot clear the current account's successful registration", async () => {
  let owner: string | null = 'parent-b';
  await assert.rejects(replaceOwnedHangoutMonitoring({
    clearOwner: async () => { owner = null; },
    isSameAccount: async () => false,
    replaceRegions: async () => { throw new Error('Should not run'); },
    claimOwner: async () => { owner = 'parent-a'; },
  }), /account changed/);
  assert.equal(owner, 'parent-b');
});

test('successful setup claims ownership only after native registration succeeds', async () => {
  const actions: string[] = [];
  await replaceOwnedHangoutMonitoring({
    clearOwner: async () => { actions.push('clear'); },
    isSameAccount: async () => true,
    replaceRegions: async () => { actions.push('register'); },
    claimOwner: async () => { actions.push('claim'); },
  });
  assert.deepEqual(actions, ['clear', 'register', 'claim']);
});
