import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdentityScopedLookup } from '../src/lib/identity-scoped-lookup.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('a late parent lookup for A cannot overwrite the cached parent for B', async () => {
  const a = deferred<string>();
  const b = deferred<string>();
  const loaded: string[] = [];
  const lookup = createIdentityScopedLookup({
    resolveIdentity: async () => 'a',
    load: (owner) => { loaded.push(owner); return owner === 'a' ? a.promise : b.promise; },
  });
  lookup.setIdentity('a');
  const old = assert.rejects(lookup.get(), /account changed/);
  lookup.setIdentity('b');
  assert.equal(lookup.peek(), undefined);
  const current = lookup.get();
  b.resolve('parent-b');
  assert.equal(await current, 'parent-b');
  a.resolve('parent-a');
  await old;
  assert.equal(lookup.peek(), 'parent-b');
  assert.equal(await lookup.get(), 'parent-b');
  assert.deepEqual(loaded, ['a', 'b']);
});

test('a stale getUser result cannot switch identity back after account change', async () => {
  const user = deferred<string | null>();
  const loaded: string[] = [];
  const lookup = createIdentityScopedLookup({
    resolveIdentity: () => user.promise,
    load: async (owner) => { loaded.push(owner); return `parent-${owner}`; },
  });
  const stale = assert.rejects(lookup.get(), /account changed/);
  lookup.setIdentity('b');
  user.resolve('a');
  await stale;
  assert.deepEqual(loaded, []);
  assert.equal(await lookup.get(), 'parent-b');
});

test('matching initial auth event can arrive while the first getUser call is pending', async () => {
  const user = deferred<string | null>();
  const lookup = createIdentityScopedLookup({
    resolveIdentity: () => user.promise,
    load: async (owner) => `parent-${owner}`,
  });
  const pending = lookup.get();
  lookup.setIdentity('a');
  user.resolve('a');
  assert.equal(await pending, 'parent-a');
});

test('same-user token refresh keeps the shared cache and deduplicates pending consumers', async () => {
  const parent = deferred<string>();
  let loads = 0;
  const lookup = createIdentityScopedLookup({
    resolveIdentity: async () => 'a',
    load: () => { loads += 1; return parent.promise; },
  });
  lookup.setIdentity('a');
  const first = lookup.get();
  const second = lookup.get();
  lookup.setIdentity('a');
  parent.resolve('parent-a');
  assert.deepEqual(await Promise.all([first, second]), ['parent-a', 'parent-a']);
  assert.equal(await lookup.get(), 'parent-a');
  assert.equal(loads, 1);
});

test('sign-out invalidates old work even if the same user signs back in', async () => {
  const parent = deferred<string>();
  const lookup = createIdentityScopedLookup({
    resolveIdentity: async () => 'a',
    load: () => parent.promise,
  });
  lookup.setIdentity('a');
  const stale = assert.rejects(lookup.get(), /account changed/);
  lookup.setIdentity(null);
  await assert.rejects(lookup.get(), /Not authenticated/);
  lookup.setIdentity('a');
  parent.resolve('parent-a');
  await stale;
  assert.equal(lookup.peek(), undefined);
});

test('a failed lookup is retryable and never cached as a successful identity', async () => {
  let attempts = 0;
  const lookup = createIdentityScopedLookup({
    resolveIdentity: async () => 'a',
    load: async () => {
      if (++attempts === 1) throw new Error('Offline');
      return 'parent-a';
    },
  });
  await assert.rejects(lookup.get(), /Offline/);
  assert.equal(lookup.peek(), undefined);
  assert.equal(await lookup.get(), 'parent-a');
  assert.equal(attempts, 2);
});
