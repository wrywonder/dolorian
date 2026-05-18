import { Pressable, Text, View } from 'react-native';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { FadeOverlay, PhotoTile, TimeStampPill } from '@/components/ui';
import { dayShort, timeShort } from '@/lib/format';
import { presentInterestSheet } from './InterestSheet';
import { SocialProofRow } from './SocialProofRow';
import type { ActivitySocialProof, InteractionState } from '@/types';

type ActivityCardProps = {
  proof: ActivitySocialProof;
  /** Rotation degrees for the polaroid wobble. */
  rotation?: number;
  onStateChanged?: (next: InteractionState | null) => void;
};

/**
 * Polaroid-style activity card. Striped header (tone keyed by activity
 * emoji), date + time pills, italic-serif title, location + tagline,
 * white footer with social-proof avatar stacks + the "I'm in →" CTA.
 *
 * An emoji sticker floats over the top-right corner, overflowing the
 * card. The whole card sits at a slight rotation per the design.
 */
export function ActivityCard({ proof, rotation = 0, onStateChanged }: ActivityCardProps) {
  const { activity, venue, goingConnections, interestedConnections, myState } = proof;
  const tone = toneForActivity(activity.emoji);

  const buttonLabel = labelForState(myState);

  return (
    <View style={{ position: 'relative', marginBottom: 26 }}>
      <View
        style={{
          borderRadius: 22,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.rule,
          transform: [{ rotate: `${rotation}deg` }],
          shadowColor: '#2D241B',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 22,
          elevation: 6,
          backgroundColor: colors.surface,
        }}
      >
        {/* HEADER */}
        <View style={{ position: 'relative' }}>
          <PhotoTile
            tone={tone}
            height={210}
            label={activity.name.toUpperCase()}
          />
          <FadeOverlay direction="bottom" intensity={0.7} transparentUntil={0.25} />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingTop: 70,
              paddingHorizontal: 16,
              paddingBottom: 14,
            }}
          >
            {activity.starts_at ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <TimeStampPill
                  label={dayShort(activity.starts_at)}
                  variant="light"
                />
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansBold,
                      fontSize: 11,
                      color: colors.white,
                    }}
                  >
                    {timeShort(activity.starts_at)}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 26,
                color: colors.white,
                lineHeight: 28,
                letterSpacing: -0.3,
              }}
            >
              {activity.name}
            </Text>
            {(venue || activity.description) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {venue ? (
                  <Text
                    style={{
                      fontFamily: fonts.sansSemi,
                      fontSize: 12.5,
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    {venue.name}
                    {activity.description ? ' · ' : ''}
                  </Text>
                ) : null}
                {activity.description ? (
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    {activity.description}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* FOOTER */}
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 13,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <SocialProofRow
            goingConnections={goingConnections}
            interestedConnections={interestedConnections}
          />
          <Pressable
            onPress={() =>
              presentInterestSheet({
                activityId: activity.id,
                activityName: activity.name,
                emoji: activity.emoji,
                currentState: myState,
                onChanged: (next) => onStateChanged?.(next),
              })
            }
            style={{
              backgroundColor: colors.terracotta,
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 14,
              shadowColor: '#924328',
              shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 0,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansExtra,
                fontSize: 13,
                color: colors.white,
              }}
            >
              {buttonLabel}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* sticker emoji — overflows the card top-right */}
      {activity.emoji ? (
        <View
          style={{
            position: 'absolute',
            top: -16,
            right: -8,
            transform: [{ rotate: `${-rotation * 5}deg` }],
          }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontSize: 46,
              textShadowColor: 'rgba(0,0,0,0.2)',
              textShadowRadius: 6,
              textShadowOffset: { width: 0, height: 3 },
            }}
          >
            {activity.emoji}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function labelForState(state: InteractionState | null): string {
  switch (state) {
    case 'going':
    case 'attended':
      return 'Going ✓';
    case 'interested':
      return 'Interested';
    default:
      return "I'm in →";
  }
}

function toneForActivity(emoji: string | null): AvatarTone {
  switch (emoji) {
    case '⚽':
      return 'golden';
    case '🥾':
      return 'sage';
    case '🩰':
      return 'mauve';
    case '🏊':
      return 'slate';
    case '📚':
      return 'mauve';
    case '🎂':
      return 'peach';
    case '🎶':
      return 'rose';
    default:
      return 'butter';
  }
}
