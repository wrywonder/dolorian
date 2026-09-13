import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectionPushHandler, type ClaimedNotification } from '../supabase/functions/connection-push/handler.ts';
const actor = '88000000-0000-4000-8000-000000000001';
const recipient = '88000000-0000-4000-8000-000000000002';
const plan = '88000000-0000-4000-8000-000000000003';
const row: ClaimedNotification = { id: 'notification', title: 'A plan with friends ✨', body: 'Alex shared Picnic. Want to join?', url: `/plan/${plan}`, push_claimed_at: '2026-09-13T12:00:00Z' };
const body = { recipientId: recipient, type: 'plan_invite', planId: plan };
const request = (value: unknown = body, authorization = 'Bearer test') => new Request('https://example.test/connection-push', {
  method: 'POST', headers: authorization ? { Authorization: authorization, 'Content-Type': 'application/json' } : {}, body: JSON.stringify(value),
});
function setup(overrides: Partial<Parameters<typeof createConnectionPushHandler>[0]> = {}) {
  const finished: boolean[] = [];
  const removed: string[][] = [];
  const claims: unknown[] = [];
  const messages: Record<string, unknown>[][] = [];
  const handler = createConnectionPushHandler({
    authenticate: async () => actor,
    claim: async (id, input) => { claims.push([id, input]); return row; },
    tokens: async () => ['ExpoPushToken[test]'],
    finish: async (notification, sent) => { assert.equal(notification, row); finished.push(sent); },
    removeTokens: async (tokens) => { removed.push(tokens); },
    fetch: async (url, init) => {
      assert.equal(url, 'https://exp.host/--/api/v2/push/send');
      assert.ok(init?.signal);
      const batch = JSON.parse(init?.body as string) as Record<string, unknown>[];
      messages.push(batch);
      return Response.json({ data: batch.map(() => ({ status: 'ok' })) });
    }, ...overrides,
  });
  return { handler, finished, removed, claims, messages };
}

test('push rejects malformed recipients, plan links, JSON, and unauthenticated callers before claiming', async () => {
  const state = setup();
  assert.equal((await state.handler(request(body, ''))).status, 401);
  for (const bad of [null, [], {}, { ...body, recipientId: '-'.repeat(36) }, { ...body, planId: '../profile/other' }, { ...body, type: 'connection_request' }, { ...body, type: 'arbitrary' }]) {
    assert.equal((await state.handler(request(bad))).status, 400);
  }
  assert.equal((await state.handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: '{' }))).status, 400);
  assert.equal(state.claims.length, 0);
  assert.equal((await setup({ authenticate: async () => null }).handler(request())).status, 401);
});

test('a plan push authenticates the actor, pins the plan, and only sends server-owned copy and route', async () => {
  const state = setup();
  const response = await state.handler(request({ ...body, actorId: recipient, title: 'Spoof', body: 'Spoof', url: '/profile/other' }));
  assert.deepEqual(state.claims, [[actor, body]]);
  assert.deepEqual(await response.json(), { delivered: 1 });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(state.messages[0], [{ to: 'ExpoPushToken[test]', sound: 'default', title: row.title, body: row.body, data: { url: row.url }, channelId: 'village' }]);
  assert.deepEqual(state.finished, [true]);
});

test('old clients may omit the plan; nonexistent or already leased notifications send nothing', async () => {
  const state = setup({ claim: async () => null });
  assert.deepEqual(await (await state.handler(request({ recipientId: recipient, type: 'plan_invite' }))).json(), { delivered: 0, duplicate: true });
  assert.equal(state.messages.length, 0);
  assert.deepEqual(state.finished, []);
});

test('missing devices and push errors release the lease without pretending delivery succeeded', async () => {
  for (const overrides of [
    { tokens: async () => [] },
    { tokens: async (): Promise<string[]> => { throw new Error('private service error'); } },
    { fetch: async () => new Response('upstream secret', { status: 503 }) },
    { fetch: async (): Promise<Response> => { throw new Error('secret token'); } },
    { fetch: async () => Response.json({ data: [] }) },
    { fetch: async () => Response.json({ data: [{ status: 'error', details: { error: 'MessageRateExceeded' } }] }) },
  ]) {
    const state = setup(overrides);
    const response = await state.handler(request());
    assert.match(await response.text(), /delivered":0|temporarily unavailable|did not accept/);
    assert.deepEqual(state.finished, [false]);
  }
});

test('stale device tokens are removed while accepted devices mark the notification sent', async () => {
  const state = setup({ tokens: async () => ['good', 'stale'], fetch: async () => Response.json({ data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] }) });
  assert.deepEqual(await (await state.handler(request())).json(), { delivered: 1 });
  assert.deepEqual(state.removed, [['stale']]);
  assert.deepEqual(state.finished, [true]);
});

test('large device lists respect Expo batch limits and retain the exact plan route', async () => {
  const state = setup({ tokens: async () => Array.from({ length: 101 }, (_, i) => `token-${i}`) });
  assert.deepEqual(await (await state.handler(request())).json(), { delivered: 101 });
  assert.deepEqual(state.messages.map((batch) => batch.length), [100, 1]);
  assert.deepEqual(state.messages[1]?.[0]?.data, { url: row.url });
});

test('existing connection notification request types remain supported without a plan', async () => {
  for (const type of ['connection_request', 'connection_accepted', 'invite_redeemed']) {
    const state = setup();
    assert.equal((await state.handler(request({ recipientId: recipient, type }))).status, 200);
    assert.deepEqual(state.claims, [[actor, { recipientId: recipient, type }]]);
  }
});
