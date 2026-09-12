import { Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/lib/constants';
import { AvatarCircle } from '@/components/ui';
import { planRsvpCopy } from '@/lib/plan-rsvp-copy';
import type { InteractionState, PlanKind, PlanParticipant } from '@/types';

type SocialProofProps = {
  goingConnections: PlanParticipant[];
  interestedConnections: PlanParticipant[];
  myState: InteractionState | null;
  planKind: PlanKind;
};

/** Responses are parents, not households. Include the viewer without inventing a family count. */
export function SocialProofRow({ goingConnections, interestedConnections, myState, planKind }: SocialProofProps) {
  const mineGoing = myState === 'going' || myState === 'attended';
  const mineInterested = myState === 'interested';
  const people = [...goingConnections, ...interestedConnections].slice(0, 3);
  const copy = planRsvpCopy(planKind);
  const countLabel = (count: number, mine: boolean, label: string) => mine
    ? count ? `You + ${count} ${label}` : label === 'maybe' ? 'You’re a maybe' : `You’re ${label}`
    : count ? `${count} ${count === 1 ? 'parent' : 'parents'} ${label}` : null;
  const goingLabel = countLabel(goingConnections.length, mineGoing, copy.goingGroup);
  const interestedLabel = countLabel(interestedConnections.length, mineInterested, planKind === 'signup' ? 'considering' : 'maybe');

  return (
    <View style={{ flex: 1, gap: spacing.xs, alignItems: 'flex-start' }}>
      {people.length ? <View style={{ flexDirection: 'row' }}>{people.map((person, index) => (
        <AvatarCircle key={person.parent_id} initials={person.avatar_initials} tone={person.avatar_color} imageUrl={person.avatar_url} size={24} style={{ marginLeft: index ? -7 : 0, borderWidth: 2, borderColor: colors.surface }} />
      ))}</View> : null}
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 10.5, lineHeight: 15, color: goingLabel ? colors.sage : colors.brownMid }}>
        {goingLabel ?? interestedLabel ?? 'Who’s in?'}
      </Text>
      {goingLabel && interestedLabel ? <Text style={{ fontFamily: fonts.sans, fontSize: 10.5, lineHeight: 15, color: colors.brownMid }}>{interestedLabel}</Text> : null}
    </View>
  );
}
