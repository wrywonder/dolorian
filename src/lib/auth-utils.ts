import type { AvatarTone } from '@/lib/constants';

export const REVIEW_EMAIL = 'appreview@dolorian.app';

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Add your email address first.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Check that your email address is complete.';
  }
  return null;
}

export function normalizeLoginCode(value: string): string {
  return value.replace(/[\s-]+/g, '');
}

export function validateLoginCode(value: string, expectedLength = 8): string | null {
  const code = normalizeLoginCode(value);
  if (!code) return 'Enter the code from your email.';
  if (!new RegExp(`^\\d{${expectedLength}}$`).test(code)) {
    return `Enter the ${expectedLength}-digit code from your email.`;
  }
  return null;
}

export function displayNameFromAuthMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const value = (metadata as { full_name?: unknown }).full_name;
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function initialsForName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export function accountDestination(hasProfile: boolean, invite?: string): string {
  if (!hasProfile) return invite ? `/(auth)/onboard?invite=${encodeURIComponent(invite)}` : '/(auth)/onboard';
  return invite ? `/join/${encodeURIComponent(invite)}` : '/(tabs)/buzz';
}

export function friendlyAuthError(cause: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = cause && typeof cause === 'object' && 'message' in cause
    ? String((cause as { message?: unknown }).message ?? '')
    : cause instanceof Error ? cause.message : '';
  const message = raw.toLowerCase();
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many tries in a short time. Wait a minute, then try again.';
  }
  if (message.includes('expired')) return 'That code expired. Send yourself a new one.';
  if (message.includes('invalid') && (message.includes('token') || message.includes('otp'))) {
    return 'That code doesn’t look right. Check the email and try again.';
  }
  if (message.includes('invalid login credentials')) {
    return 'That password doesn’t match the review account.';
  }
  if (
    message.includes('email address not authorized')
    || message.includes('sending confirmation email')
    || message.includes('unexpected_failure')
  ) {
    return 'Village couldn’t send that code. Try again in a moment or continue with Apple.';
  }
  if (message.includes('identity token')) {
    return 'Apple couldn’t securely finish the sign-in. Please try again.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Village couldn’t reach the internet. Check your connection and try again.';
  }
  return raw.trim() || fallback;
}

export function prepareOnboardingInput(input: {
  displayName: string;
  neighborhood: string;
  tone: AvatarTone;
}) {
  const displayName = input.displayName.trim().replace(/\s+/g, ' ');
  const neighborhood = input.neighborhood.trim().replace(/\s+/g, ' ');
  const initials = initialsForName(displayName);
  if (displayName.length < 2) throw new Error('Add the name your village should know you by.');
  if (displayName.length > 80) throw new Error('Keep your name under 80 characters.');
  if (neighborhood.length > 80) throw new Error('Keep your neighborhood under 80 characters.');
  return { displayName, neighborhood, tone: input.tone, initials: initials || '?' };
}
