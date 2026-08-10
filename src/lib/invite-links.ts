const INVITE_ORIGIN = 'https://withvillage.app';

export function connectionInviteUrl(reference: string): string {
  return `${INVITE_ORIGIN}/join/${encodeURIComponent(reference.trim())}`;
}

export function connectionInviteMessage(url: string): string {
  return `I’d love to add you to my private parent village. Tap to connect with me in Village: ${url}`;
}
