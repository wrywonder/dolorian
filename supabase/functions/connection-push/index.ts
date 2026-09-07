import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType = 'connection_request' | 'connection_accepted' | 'invite_redeemed' | 'plan_invite';

type PushToken = {
  token: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  url: string;
};

type ExpoTicket = {
  status?: 'ok' | 'error';
  details?: { error?: string };
};

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Not authenticated' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Backend configuration is incomplete' }, 500);
  }

  const scoped = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await scoped.auth.getUser();
  if (userError || !user) return json({ error: 'Not authenticated' }, 401);

  let recipientId: string | undefined;
  let type: NotificationType | undefined;
  try {
    const body = await request.json() as { recipientId?: string; type?: NotificationType };
    recipientId = body.recipientId;
    type = body.type;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const allowed = new Set<NotificationType>([
    'connection_request', 'connection_accepted', 'invite_redeemed', 'plan_invite',
  ]);
  if (!recipientId || !/^[0-9a-f-]{36}$/i.test(recipientId) || !type || !allowed.has(type)) {
    return json({ error: 'A valid recipient and notification type are required' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: actor, error: actorError } = await admin
    .from('parents')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (actorError || !actor) return json({ error: 'Parent profile not found' }, 403);

  // Only server-created, recent, unsent notifications for the authenticated
  // actor are eligible. Clients cannot invent push copy or target strangers.
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: notification, error: notificationError } = await admin
    .from('connection_notifications')
    .select('id, title, body, url')
    .eq('actor_id', actor.id)
    .eq('recipient_id', recipientId)
    .eq('notification_type', type)
    .is('push_sent_at', null)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (notificationError) return json({ error: 'Could not verify this notification' }, 500);
  if (!notification) return json({ delivered: 0, duplicate: true });

  const { data: tokens, error: tokenError } = await admin
    .from('parent_push_tokens')
    .select('token')
    .eq('parent_id', recipientId);
  if (tokenError) return json({ error: 'Could not load recipient devices' }, 500);
  if (!tokens?.length) return json({ delivered: 0 });

  const row = notification as NotificationRow;
  const messages = (tokens as PushToken[]).map(({ token }) => ({
    to: token,
    sound: 'default',
    title: row.title,
    body: row.body,
    data: { url: row.url },
    channelId: 'village',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) return json({ error: 'Push delivery service is unavailable' }, 502);

  const payload = await response.json() as { data?: ExpoTicket[] | ExpoTicket };
  const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
  const invalidTokens: string[] = [];
  let delivered = 0;
  tickets.forEach((ticket, index) => {
    if (ticket.status === 'ok') delivered += 1;
    if (ticket.details?.error === 'DeviceNotRegistered' && tokens[index]?.token) {
      invalidTokens.push(tokens[index].token);
    }
  });

  if (invalidTokens.length) {
    await admin.from('parent_push_tokens').delete().in('token', invalidTokens);
  }
  if (delivered > 0) {
    await admin
      .from('connection_notifications')
      .update({ push_sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('push_sent_at', null);
  }

  return json({ delivered });
});
