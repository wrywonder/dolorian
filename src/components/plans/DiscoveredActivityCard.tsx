import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { Icon, TwinkleSparkle } from '@/components/ui';
import { dayShort, timeShort } from '@/lib/format';
import type { ActivitySocialProof } from '@/types';

type DiscoveredActivityCardProps = {
  proof: ActivitySocialProof;
  onConfirm?: () => void;
  onSkip?: () => void;
};

/**
 * Preview card for AI-discovered activities awaiting user confirmation.
 *
 * Visual hierarchy: lighter than confirmed cards, dashed border, mono
 * "DISCOVERED" tag. CTA reads "Looks interesting?" instead of "I'm in"
 * — confirming flips published=true and the card moves up into the
 * regular Plans list on the next refresh.
 */
export function DiscoveredActivityCard({
  proof,
  onConfirm,
  onSkip,
}: DiscoveredActivityCardProps) {
  const { activity } = proof;
  const friendsInterested = proof.interestedConnections.length;

  return (
    <View
      style={{
        marginBottom: 18,
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1.5,
        borderColor: colors.rule,
        borderStyle: 'dashed',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.monoBold,
            fontSize: 10,
            color: colors.taupe,
            letterSpacing: 0.7,
          }}
        >
          DISCOVERED
        </Text>
        <TwinkleSparkle size={10} color={colors.amberLight} />
        {activity.confidence_score ? (
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: colors.taupe,
              marginLeft: 'auto',
            }}
          >
            {(activity.confidence_score * 100).toFixed(0)}% match
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.cream,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26 }}>{activity.emoji ?? '✨'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 21,
              color: colors.dark,
              lineHeight: 24,
              letterSpacing: -0.2,
            }}
          >
            {activity.name}
          </Text>
          {activity.starts_at ? (
            <Text
              style={{
                fontFamily: fonts.sansSemi,
                fontSize: 12,
                color: colors.brownMid,
                marginTop: 2,
              }}
            >
              {dayShort(activity.starts_at)} · {timeShort(activity.starts_at)}
              {activity.description ? ` · ${activity.description}` : ''}
            </Text>
          ) : null}
          {friendsInterested > 0 ? (
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 13,
                color: colors.sage,
                marginTop: 4,
              }}
            >
              {friendsInterested} fam{friendsInterested === 1 ? '' : 's'} you know already interested
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingLeft: 56 }}>
        <Pressable
          onPress={onConfirm}
          style={{
            backgroundColor: colors.terracotta,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#924328',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 0,
            elevation: 3,
          }}
        >
          <Icon name="check.circle" size={15} color={colors.white} weight={2.2} />
          <Text
            style={{
              fontFamily: fonts.sansExtra,
              fontSize: 13,
              color: colors.white,
            }}
          >
            Looks interesting?
          </Text>
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={10}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 14,
              color: colors.taupe,
              paddingVertical: 9,
              paddingHorizontal: 4,
            }}
          >
            not this time
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
