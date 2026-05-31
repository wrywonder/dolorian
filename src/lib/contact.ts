/** Contact-handle helpers for invites — keep email/phone normalization here
 *  so the client and the server (send_invite RPC) agree on canonical form. */

/** Lowercased, trimmed email. Returns null if it doesn't look like an email. */
export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  // Deliberately loose — real validation is the OTP they'll receive.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/**
 * Best-effort E.164 normalization for the closed beta. A bare 10-digit number
 * is assumed US (+1); anything already prefixed with + is kept as-is.
 * Returns null if we can't form a plausible number.
 */
export function normalizePhoneE164(raw: string): string | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (hasPlus) {
    return digits.length >= 8 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}
