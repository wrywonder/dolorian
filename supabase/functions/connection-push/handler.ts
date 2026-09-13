export type NotificationType = 'connection_request' | 'connection_accepted' | 'invite_redeemed' | 'plan_invite';
export type ClaimedNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
  push_claimed_at: string;
};
type PushRequest = { recipientId: string; type: NotificationType; planId?: string };
type Dependencies = {
  authenticate: (authorization: string) => Promise<string | null>;
  claim: (actorId: string, request: PushRequest) => Promise<ClaimedNotification | null>;
  tokens: (recipientId: string) => Promise<string[]>;
  finish: (notification: ClaimedNotification, sent: boolean) => Promise<void>;
  removeTokens: (tokens: string[]) => Promise<void>;
  fetch: typeof fetch;
};
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store',
};
const types = new Set(['connection_request', 'connection_accepted', 'invite_redeemed', 'plan_invite']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: cors });

export function createConnectionPushHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Not authenticated' }, 401);
    let input: PushRequest;
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
      const value = body as Record<string, unknown>;
      if (!validId(value.recipientId) || typeof value.type !== 'string' || !types.has(value.type)
        || (value.planId !== undefined && (!validId(value.planId) || value.type !== 'plan_invite'))) {
        throw new Error('Invalid notification');
      }
      input = { recipientId: value.recipientId, type: value.type as NotificationType,
        ...(value.planId ? { planId: value.planId as string } : {}) };
    } catch {
      return json({ error: 'A valid recipient, notification type, and optional plan are required' }, 400);
    }

    let claimed: ClaimedNotification | null = null;
    let accepted = 0;
    try {
      const actor = await deps.authenticate(authorization);
      if (!actor) return json({ error: 'Not authenticated' }, 401);
      const notification = await deps.claim(actor, input);
      claimed = notification;
      if (!notification) return json({ delivered: 0, duplicate: true });
      const tokens = await deps.tokens(input.recipientId);
      if (!tokens.length) return json({ delivered: 0 });

      // Expo accepts at most 100 messages per request. Copy and navigation come
      // solely from the claimed database row, never from the caller's body.
      for (let start = 0; start < tokens.length; start += 100) {
        const batch = tokens.slice(start, start + 100);
        const response = await deps.fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify(batch.map((token) => ({
            to: token, sound: 'default', title: notification.title, body: notification.body,
            data: { url: notification.url }, channelId: 'village',
          }))),
        });
        if (!response.ok) throw new Error('Push service unavailable');
        const payload = await response.json() as {
          data?: { status?: string; details?: { error?: string } }[];
        };
        if (!Array.isArray(payload.data) || payload.data.length !== batch.length) {
          throw new Error('Invalid push response');
        }
        const invalid: string[] = [];
        payload.data.forEach((ticket, index) => {
          if (ticket.status === 'ok') accepted += 1;
          if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(batch[index]!);
        });
        if (invalid.length) await deps.removeTokens(invalid);
      }
      if (!accepted) return json({ error: 'Push delivery service did not accept the notification' }, 502);
      // "delivered" is retained for older clients. It counts Expo-accepted
      // tickets, not confirmed presentation by APNs/FCM on a physical device.
      return json({ delivered: accepted });
    } catch {
      return json({ error: 'Notification delivery is temporarily unavailable' }, 502);
    } finally {
      if (claimed) {
        try { await deps.finish(claimed, accepted > 0); }
        catch { console.warn('Could not finish notification delivery; the lease will expire.'); }
      }
    }
  };
}
