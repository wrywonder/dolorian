import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { AvatarCircle } from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import type { Parent } from '@/types';

type SocialProofProps = {
  goingConnections: Parent[];
  interestedConnections: Parent[];
};

/**
 * Two visually distinct stacks — "going" is bolder/heavier, "interested"
 * sits below in a lighter weight. When only one state is present we
 * collapse to a single row that visually matches the original design.
 */
export function SocialProofRow({ goingConnections, interestedConnections }: SocialProofProps) {
  const hasGoing = goingConnections.length > 0;
  const hasInterest = interestedConnections.length > 0;

  if (!hasGoing && !hasInterest) {
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

  // Single-state — match the original design's compact row exactly.
  if (hasGoing && !hasInterest) {
    return (
      <SingleStack
        parents={goingConnections}
        label="going"
        accent={colors.sage}
        bold
      />
    );
  }
  if (hasInterest && !hasGoing) {
    return (
      <SingleStack
        parents={interestedConnections}
        label="interested"
        accent={colors.taupe}
      />
    );
  }

  // Both present — stack vertically, going row first, lighter row below.
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <SingleStack
        parents={goingConnections}
        label="going"
        accent={colors.sage}
        bold
      />
      <SingleStack
        parents={interestedConnections}
        label="interested"
        accent={colors.taupe}
        compact
      />
    </View>
  );
}

type SingleStackProps = {
  parents: Parent[];
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
            key={p.id}
            initials=""
            tone={p.avatar_color}
            size={size}
            onPress={() => openProfile(p.id)}
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
          {parents.length} fam{parents.length === 1 ? '' : 's'}
        </Text>{' '}
        you know are {label}
      </Text>
    </View>
  );
}
