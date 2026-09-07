import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/invite-links/src/worker.js';

test('serves the Apple association for the signed Village app', async () => {
  const response = await worker.fetch(new Request(
    'https://withvillage.app/.well-known/apple-app-site-association',
  ));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  const body = await response.json() as {
    applinks: { details: { appIDs: string[]; components: { '/': string }[] }[] };
  };
  assert.deepEqual(body.applinks.details[0]?.appIDs, ['756X7G9F7X.com.dolorian.app']);
  assert.equal(body.applinks.details[0]?.components[0]?.['/'], '/join/*');
});

test('serves a branded handoff with the legacy app-scheme fallback', async () => {
  const response = await worker.fetch(new Request(
    'https://withvillage.app/join/abc%20123',
  ));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const html = await response.text();
  assert.match(html, /come join me in Village/);
  assert.match(html, /dolorian:\/\/invite\/abc%20123/);
});

test('does not claim unrelated withvillage.app paths', async () => {
  const response = await worker.fetch(new Request('https://withvillage.app/private'));
  assert.equal(response.status, 404);
});
