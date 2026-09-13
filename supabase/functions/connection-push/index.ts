import { createClient } from 'npm:@supabase/supabase-js@2';
import { createConnectionPushHandler, type ClaimedNotification } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

Deno.serve(createConnectionPushHandler({
  fetch,
  authenticate: async (authorization) => {
    const scoped = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user }, error } = await scoped.auth.getUser();
    if (error || !user) return null;
    const { data: actor, error: actorError } = await admin.from('parents')
      .select('id').eq('auth_user_id', user.id).single();
    if (actorError) throw actorError;
    return actor?.id ?? null;
  },
  claim: async (actorId, input) => {
    const { data, error } = await admin.rpc('claim_connection_notification', {
      p_actor: actorId, p_recipient: input.recipientId,
      p_type: input.type, p_plan: input.planId ?? null,
    }).maybeSingle();
    if (error) throw error;
    return data as ClaimedNotification | null;
  },
  tokens: async (recipientId) => {
    const { data, error } = await admin.from('parent_push_tokens').select('token').eq('parent_id', recipientId);
    if (error) throw error;
    return (data ?? []).map((row) => row.token as string);
  },
  finish: async (notification, sent) => {
    const { error } = await admin.from('connection_notifications')
      .update({ push_claimed_at: null, ...(sent ? { push_sent_at: new Date().toISOString() } : {}) })
      .eq('id', notification.id).eq('push_claimed_at', notification.push_claimed_at);
    if (error) throw error;
  },
  removeTokens: async (tokens) => {
    const { error } = await admin.from('parent_push_tokens').delete().in('token', tokens);
    if (error) throw error;
  },
}));
