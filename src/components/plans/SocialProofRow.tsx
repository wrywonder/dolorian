import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { AvatarCircle } from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import type { PlanParticipant } from '@/types';

type SocialProofProps = {
  goingConnections: PlanParticipant[];
  interestedConnections: PlanParticipant[];
  outConnections?: PlanParticipant[];
  hasExternalListing?: boolean;
};

/**
 * Compact participant stacks for going, interested, and out responses.
 */
export function SocialProofRow({ goingConnections, interestedConnections, outConnections = [], hasExternalListing = false }: SocialProofProps) {
  const hasGoing = goingConnections.length > 0;
  const hasInterest = interestedConnections.length > 0;
  const hasOut = outConnections.length > 0;

  if (!hasGoing && !hasInterest && !hasOut) {
    return (
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.serif,
          fontSize: 13.5,
          color: colors.taupe,
        }}
      >
        be the first
      </Text>
    );
  }

  return (
    <View style={{ flex: 1, gap: 6 }}>
      {hasGoing ? <SingleStack parents={goingConnections} label={hasExternalListing ? 'signed up' : 'going'} accent={colors.sage} bold /> : null}
      {hasInterest ? <SingleStack parents={interestedConnections} label={hasExternalListing ? 'considering it' : 'interested'} accent={colors.taupe} compact={hasGoing} /> : null}
      {hasOut ? <SingleStack parents={outConnections} label={hasExternalListing ? 'not this time' : 'can’t make it'} accent={colors.terracotta} compact /> : null}
    </View>
  );
}

type SingleStackProps = {
  parents: PlanParticipant[];
  label: string;
  accent: string;
  bold?: boolean;
  compact?: boolean;
};

function SingleStack({ parents, label, accent, bold = false, compact = false }: SingleStackProps) {
  const size = compact ? 22 : 28;
  const overlap = compact ? -8 : -10;
  const stack = parents.slice(0, 3);
  const openProfile = useProfileLink();

  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flexDirection: 'row' }}>
        {stack.map((p, i) => (
          <AvatarCircle
            key={p.parent_id}
            initials={p.avatar_initials}
            tone={p.avatar_color}
            imageUrl={p.avatar_url}
            size={size}
            onPress={p.profile_visible ? () => openProfile(p.parent_id) : undefined}
            style={{
              marginLeft: i ? overlap : 0,
              borderWidth: 2.5,
              borderColor: colors.surface,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.serif,
          fontSize: compact ? 12.5 : 13.5,
          color: accent,
          lineHeight: compact ? 16 : 18,
        }}
      >
        <Text
          style={{
            fontStyle: 'normal',
            fontFamily: bold ? fonts.sansExtra : fonts.sansBold,
            color: accent,
          }}
        >
          {parents.length} {parents.length === 1 ? 'family' : 'families'}
        </Text>{' '}
        {label}
      </Text>
    </View>
  );
}
