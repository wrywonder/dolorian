const APP_STORE_CONNECT_TEAM_ID = '2c2fa1ca-a3a5-4c70-b29e-a0a2601d2057';
const APP_STORE_CONNECT_APP_ID = '6780107858';
const FEEDBACK_DESTINATION = 'beta@withvillage.app';
const FEEDBACK_SENDER = 'Village TestFlight <testflight@withvillage.app>';

type FeedbackEventType =
  | 'betaFeedbackScreenshotSubmissionCreated'
  | 'betaFeedbackCrashSubmissionCreated';

type AppleWebhookPayload = {
  data?: {
    id?: string;
    type?: string;
    attributes?: { timestamp?: string };
    relationships?: {
      instance?: { data?: { id?: string } };
    };
  };
};

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function expectedSignature(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `hmacsha256=${toHex(signature)}`;
}

function feedbackDetails(type: FeedbackEventType): { label: string; url: string } {
  const base = `https://appstoreconnect.apple.com/teams/${APP_STORE_CONNECT_TEAM_ID}/apps/${APP_STORE_CONNECT_APP_ID}/testflight`;
  if (type === 'betaFeedbackCrashSubmissionCreated') {
    return { label: 'crash report', url: `${base}/crashes` };
  }
  return { label: 'screenshot feedback', url: `${base}/screenshots` };
}

async function sendAlert(
  apiKey: string,
  eventId: string,
  type: FeedbackEventType,
  timestamp: string | undefined,
): Promise<Response> {
  const { label, url } = feedbackDetails(type);
  const occurredAt = timestamp ? new Date(timestamp).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : 'unknown time';
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `appstore-feedback-${eventId}`,
    },
    body: JSON.stringify({
      from: FEEDBACK_SENDER,
      to: [FEEDBACK_DESTINATION],
      subject: `[TestFlight] New ${label}`,
      text: `Apple reported new TestFlight ${label} at ${occurredAt}.\n\nOpen it in App Store Connect: ${url}\n\nWebhook event: ${eventId}`,
      tags: [
        { name: 'source', value: 'app-store-connect' },
        { name: 'event', value: type },
      ],
    }),
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const webhookSecret = Deno.env.get('APP_STORE_CONNECT_WEBHOOK_SECRET');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!webhookSecret || !resendApiKey) {
    return json({ error: 'Webhook configuration is incomplete' }, 500);
  }

  const body = await request.text();
  const signature = request.headers.get('x-apple-signature') ?? '';
  const expected = await expectedSignature(body, webhookSecret);
  if (!timingSafeEqual(signature, expected)) return json({ error: 'Invalid signature' }, 401);

  let payload: AppleWebhookPayload;
  try {
    payload = JSON.parse(body) as AppleWebhookPayload;
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const eventId = payload.data?.id;
  const type = payload.data?.type;
  if (!eventId || !type) return json({ error: 'Invalid webhook payload' }, 400);

  const feedbackEvents = new Set<FeedbackEventType>([
    'betaFeedbackScreenshotSubmissionCreated',
    'betaFeedbackCrashSubmissionCreated',
  ]);
  if (!feedbackEvents.has(type as FeedbackEventType)) {
    return json({ received: true, ignored: type });
  }

  const response = await sendAlert(
    resendApiKey,
    eventId,
    type as FeedbackEventType,
    payload.data?.attributes?.timestamp,
  );
  if (!response.ok) {
    console.error('Resend could not send TestFlight feedback alert', response.status);
    return json({ error: 'Could not send feedback alert' }, 502);
  }

  return json({ received: true, eventId });
});
