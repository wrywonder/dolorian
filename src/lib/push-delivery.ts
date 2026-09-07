import { supabase } from '@/lib/supabase';

export type VillagePushType =
  | 'connection_request'
  | 'connection_accepted'
  | 'invite_redeemed'
  | 'plan_invite';

/**
 * Best-effort remote delivery for a notification already created by a guarded
 * database function. The Edge Function independently verifies the signed-in
 * actor and server-created notification before contacting Expo Push.
 */
export async function deliverVillagePush(
  recipientId: string,
  type: VillagePushType,
): Promise<void> {
  const { error } = await supabase.functions.invoke('connection-push', {
    body: { recipientId, type },
  });
  if (error) throw error;
}

export async function deliverVillagePushBestEffort(
  recipientId: string,
  type: VillagePushType,
): Promise<void> {
  try {
    await deliverVillagePush(recipientId, type);
  } catch (cause) {
    console.warn('remote notification delivery failed', cause);
  }
}
