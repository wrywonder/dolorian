import type { InteractionState, PlanKind } from '@/types';

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
  prompt: 'see you there?',
  going: 'Going',
  interested: 'Maybe',
  out: 'Can’t make it',
  goingGroup: 'going',
  interestedGroup: 'maybe',
  outGroup: 'can’t make it',
  detailsLabel: 'Your details · optional',
  detailsHelp: 'Who’s coming, what you’re bringing, or anything friends should know.',
  detailsPlaceholder: 'Leo · Saturday afternoon · bringing snacks',
};

const registrationCopy: PlanRsvpCopy = {
  prompt: 'joining this one?',
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

export function planRsvpCopy(kind: PlanKind): PlanRsvpCopy {
  return kind === 'signup' ? registrationCopy : informalCopy;
}

export function planStateLabel(state: InteractionState | null, kind: PlanKind): string {
  const copy = planRsvpCopy(kind);
  switch (state) {
    case 'going':
    case 'attended':
      return `${copy.going} ✓`;
    case 'interested':
      return copy.interested;
    case 'out':
      return copy.out;
    default:
      return 'Respond →';
  }
}
