import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlaceSearchHandler } from '../supabase/functions/place-search/handler.ts';
const sessionToken = '12345678-1234-1234-1234-123456789abc';
const request = (body: unknown, auth = true) => new Request('https://example.test/place-search', { method: 'POST', headers: auth ? { Authorization: 'Bearer test-user' } : {}, body: JSON.stringify(body) });

test('place search authenticates before using a paid provider', async () => {
  let calls = 0;
  const handler = createPlaceSearchHandler({ apiKey: 'test', authenticate: async () => false, fetch: async () => { calls++; return Response.json({}); } });
  assert.equal((await handler(request({ query: 'park', sessionToken }, false))).status, 401);
  assert.equal((await handler(request({ query: 'park', sessionToken }))).status, 401);
  assert.equal(calls, 0);
});
test('place search rejects malformed requests and arbitrary provider paths', async () => {
  let calls = 0;
  const handler = createPlaceSearchHandler({ apiKey: 'test', authenticate: async () => true, fetch: async () => { calls++; return Response.json({}); } });
  for (const body of [null, [], { query: 'a', sessionToken }, { query: 'a'.repeat(201), sessionToken }, { query: 'park', sessionToken: 'bad' }, { placeId: '../users', sessionToken }, { placeId: 'valid-id', query: 'park', sessionToken }]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal(calls, 0);
});
test('autocomplete returns only useful place predictions and keeps the search session', async () => {
  const handler = createPlaceSearchHandler({ apiKey: 'test', authenticate: async () => true, fetch: async (url, init) => {
    assert.equal(url, 'https://places.googleapis.com/v1/places:autocomplete');
    assert.deepEqual(JSON.parse(init?.body as string), { input: 'Park San Francisco', sessionToken });
    assert.ok(init?.signal);
    return Response.json({ suggestions: [{ placePrediction: { placeId: 'park-1', structuredFormat: { mainText: { text: 'Park' }, secondaryText: { text: 'San Francisco' } } } }, { queryPrediction: {} }, { placePrediction: { placeId: 'missing-name' } }] });
  } });
  const response = await handler(request({ query: ' Park San Francisco ', sessionToken }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { suggestions: [{ id: 'park-1', name: 'Park', address: 'San Francisco' }] });
});
test('a chosen place resolves its full address using the same session', async () => {
  const handler = createPlaceSearchHandler({ apiKey: 'test', authenticate: async () => true, fetch: async (url, init) => {
    assert.equal(url, `https://places.googleapis.com/v1/places/park-1?sessionToken=${sessionToken}`);
    assert.equal(init?.method, 'GET');
    return Response.json({ id: 'park-1', displayName: { text: 'Park' }, formattedAddress: '123 Main Street' });
  } });
  assert.deepEqual(await (await handler(request({ placeId: 'park-1', sessionToken }))).json(), { place: { id: 'park-1', name: 'Park', address: '123 Main Street' } });
});
test('empty search is distinct from unavailable or incomplete provider data', async () => {
  for (const [provider, status] of [[{}, 200], [{ suggestions: 'wrong shape' }, 502], [{ id: 'wrong-id', displayName: { text: 'Park' }, formattedAddress: 'street' }, 502]] as const) {
    const handler = createPlaceSearchHandler({ apiKey: 'test', authenticate: async () => true, fetch: async () => Response.json(provider) });
    assert.equal((await handler(request('id' in provider ? { placeId: 'park-1', sessionToken } : { query: 'park', sessionToken }))).status, status);
  }
  const handler = createPlaceSearchHandler({ apiKey: 'secret-not-for-the-client', authenticate: async () => true, fetch: async () => { throw new Error('secret-not-for-the-client'); } });
  const response = await handler(request({ query: 'park', sessionToken }));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /secret-not-for-the-client/);
});
test('missing provider configuration yields an honest unavailable state', async () => {
  const handler = createPlaceSearchHandler({ apiKey: undefined, authenticate: async () => true, fetch: async () => { throw new Error('must not call'); } });
  assert.equal((await handler(request({ query: 'park', sessionToken }))).status, 503);
});
