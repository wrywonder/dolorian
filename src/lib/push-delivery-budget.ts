/** Notifications follow a durable database write. A stalled push service must
 * not leave that successful action looking unsaved or invite a duplicate retry.
 * Race the deadline as well as aborting: a transport may ignore cancellation.
 */
export async function withPushDeliveryBudget(
  send: (signal: AbortSignal) => Promise<void>,
  timeoutMs = 2_500,
): Promise<void> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Notification delivery timed out.'));
    }, timeoutMs);
  });
  try { await Promise.race([send(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}
