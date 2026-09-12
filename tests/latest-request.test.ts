import assert from 'node:assert/strict';
import test from 'node:test';
import { createLatestRequest } from '../src/lib/latest-request.ts';

test('a slow earlier load cannot replace a newer successful refresh', async () => {
  const requests = createLatestRequest();
  let resolveOld: (value: string) => void = () => {};
  const oldResponse = new Promise<string>((resolve) => { resolveOld = resolve; });
  let displayed = '';
  const load = async (response: Promise<string>) => {
    const isCurrent = requests.begin();
    const value = await response;
    if (isCurrent()) displayed = value;
  };
  const oldLoad = load(oldResponse);
  await load(Promise.resolve('new RSVP'));
  resolveOld('old RSVP');
  await oldLoad;
  assert.equal(displayed, 'new RSVP');
});

test('changing an import link or leaving a screen invalidates pending responses', () => {
  const requests = createLatestRequest();
  const oldImport = requests.begin();
  requests.invalidate();
  assert.equal(oldImport(), false);
  const nextImport = requests.begin();
  assert.equal(nextImport(), true);
  assert.equal(oldImport(), false);
});
