import type { ConnectionInvitePreview } from '../types/connections';

const INVITE_ORIGIN = 'https://withvillage.app';

export function connectionInviteUrl(reference: string): string {
  return `${INVITE_ORIGIN}/join/${encodeURIComponent(reference.trim())}`;
}

export function connectionInviteMessage(url: string): string {
  return `I’d love to add you to my private parent village. Tap to connect with me in Village: ${url}`;
}

export function planInviteUrl(reference: string): string {
  // This hint changes only the browser copy. The server binds the token to a plan.
  return `${connectionInviteUrl(reference)}?plan=1`;
}

export function planInviteMessage(name: string, url: string): string {
  return `Join me for ${name.trim()}! View the plan in Village, or connect with me to see it: ${url}`;
}

export function inviteNextStep(preview: ConnectionInvitePreview | null, signedIn: boolean) {
  if (!preview?.found || !preview.inviter) return 'unavailable';
  if (signedIn && preview.plan?.can_view) return 'view-plan';
  if (!preview.plan && signedIn && preview.is_self) return 'own-invite';
  if (!preview.plan && signedIn && preview.already_connected) return 'view-profile';
  if (!preview.active) return 'expired';
  if (!signedIn) return 'sign-in';
  if (preview.needs_profile) return 'onboard';
  return 'accept';
}
