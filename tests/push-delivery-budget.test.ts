import assert from 'node:assert/strict';
import test from 'node:test';
import { withPushDeliveryBudget } from '../src/lib/push-delivery-budget.ts';

test('a stalled push releases the successful action even when transport ignores abort', async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(withPushDeliveryBudget((value) => {
    signal = value;
    return new Promise(() => {});
  }, 10), /timed out/);
  assert.equal(signal?.aborted, true);
});

test('a completed delivery clears its deadline rather than aborting a successful request later', async () => {
  let signal: AbortSignal | undefined;
  await withPushDeliveryBudget(async (value) => { signal = value; }, 10);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(signal?.aborted, false);
});

test('real delivery errors reach the existing best-effort caller unchanged', async () => {
  const error = new Error('Push unavailable');
  await assert.rejects(withPushDeliveryBudget(async () => { throw error; }, 10), (cause) => cause === error);
});
