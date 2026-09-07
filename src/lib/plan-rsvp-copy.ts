import type { InteractionState } from '@/types';

export type PlanRsvpCopy = {
  prompt: string;
  going: string;
  interested: string;
  out: string;
  goingGroup: string;
  interestedGroup: string;
  outGroup: string;
  detailsLabel: string;
  detailsHelp: string;
  detailsPlaceholder: string;
};

const informalCopy: PlanRsvpCopy = {
  prompt: 'does this work for you?',
  going: 'Going',
  interested: 'Interested',
  out: 'Can’t make it',
  goingGroup: 'going',
  interestedGroup: 'interested',
  outGroup: 'can’t make it',
  detailsLabel: 'Your details · optional',
  detailsHelp: 'Add whichever specifics matter to your family—kids, days, timing, pickup, or anything else.',
  detailsPlaceholder: 'Leo · Saturday afternoon · bringing snacks',
};

const registrationCopy: PlanRsvpCopy = {
  prompt: 'what’s your registration status?',
  going: 'Signed up',
  interested: 'Considering',
  out: 'Not this time',
  goingGroup: 'signed up',
  interestedGroup: 'considering it',
  outGroup: 'not this time',
  detailsLabel: 'Signup details · optional',
  detailsHelp: 'Add the child, days or weeks, times, group, pickup plan, or anything else that helps friends coordinate.',
  detailsPlaceholder: 'Leo · Aug 17–21 · 8:45–3 · ButterFly group',
};

export function planRsvpCopy(hasExternalListing: boolean): PlanRsvpCopy {
  return hasExternalListing ? registrationCopy : informalCopy;
}

export function planStateLabel(state: InteractionState | null, hasExternalListing: boolean): string {
  const copy = planRsvpCopy(hasExternalListing);
  switch (state) {
    case 'going':
    case 'attended':
      return `${copy.going} ✓`;
    case 'interested':
      return copy.interested;
    case 'out':
      return copy.out;
    default:
      return hasExternalListing ? 'Add my status →' : "I'm in →";
  }
}
