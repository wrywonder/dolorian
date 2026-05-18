/** Date/time helpers — keep all locale-aware formatting in one place. */

import { differenceInMinutes, format, formatDistanceToNowStrict } from 'date-fns';

/** "22m" / "1h" / "2d" — short relative time for post timestamps. */
export function relativeShort(iso: string): string {
  const d = new Date(iso);
  const mins = differenceInMinutes(new Date(), d);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  return formatDistanceToNowStrict(d, { roundingMethod: 'floor' })
    .replace(' days', 'd')
    .replace(' day', 'd');
}

/** "SAT · MAY 24" eyebrow for the Buzz header. */
export function eyebrowDate(iso: string): string {
  return format(new Date(iso), "EEE · MMM d").toUpperCase();
}

/** "SAT · 24" sticker shorthand on activity card date pills. */
export function dayShort(iso: string): string {
  return format(new Date(iso), "EEE · d").toUpperCase();
}

/** "10am" / "9:30am" for activity time pills. */
export function timeShort(iso: string): string {
  const d = new Date(iso);
  const m = d.getMinutes();
  return format(d, m === 0 ? 'ha' : 'h:mma').toLowerCase();
}

/** "SAT · 22m" stamp for the rotated post sticker. */
export function stickerStamp(iso: string): string {
  const day = format(new Date(iso), 'EEE').toUpperCase();
  return `${day} · ${relativeShort(iso)}`;
}

/** Compute age from birth year for kid cards. */
export function ageInYears(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear;
}
