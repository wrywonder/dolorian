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

test('plan handoff keeps the token and gives install-and-return guidance without private details', async () => {
  const response = await worker.fetch(new Request('https://withvillage.app/join/plan-token?plan=1&name=SECRET-HOME&redirect=https://evil.example'));
  const html = await response.text();
  assert.match(html, /let’s get together/);
  assert.match(html, /dolorian:\/\/invite\/plan-token\?plan=1/);
  assert.match(html, /install the TestFlight beta.*return to this message/);
  assert.doesNotMatch(html, /SECRET-HOME|evil\.example/);
  assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('untrusted references are escaped and invalid encodings fail closed', async () => {
  const response = await worker.fetch(new Request('https://withvillage.app/join/%3Cscript%3E?plan=1'));
  assert.doesNotMatch(await response.text(), /<script>/);
  assert.equal((await worker.fetch(new Request('https://withvillage.app/join/%ZZ?plan=1'))).status, 404);
});
