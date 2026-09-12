import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { FadeOverlay, PhotoTile, TimeStampPill } from '@/components/ui';
import { planDateLabel, planTimeLabel } from '@/lib/plan-dates';
import { planStateLabel } from '@/lib/plan-rsvp-copy';
import { presentInterestSheet } from './InterestSheet';
import { SocialProofRow } from './SocialProofRow';
import type { ActivitySocialProof, InteractionState } from '@/types';

type ActivityCardProps = {
  proof: ActivitySocialProof;
  /** Rotation degrees for the polaroid wobble. */
  rotation?: number;
  onStateChanged?: (next: InteractionState | null) => void;
  onOpen?: () => void;
};

/**
 * Polaroid-style activity card. Striped header (tone keyed by activity
 * emoji), date + time pills, italic-serif title, location + tagline,
 * white footer with social-proof avatar stacks + the "I'm in →" CTA.
 *
 * An emoji sticker floats over the top-right corner, overflowing the
 * card. The whole card sits at a slight rotation per the design.
 */
export function ActivityCard({ proof, rotation = 0, onStateChanged, onOpen }: ActivityCardProps) {
  const { activity, venue, goingConnections, interestedConnections, outConnections, myState } = proof;
  const tone = toneForActivity(activity.emoji);
  const imageUrl = activity.cover_image_url ?? venue?.image_url ?? null;
  const location = activity.location_name ?? venue?.name ?? null;
  const hasExternalListing = Boolean(activity.external_url);

  const buttonLabel = activity.cancelled_at ? 'Cancelled' : planStateLabel(myState, hasExternalListing);

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
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${activity.name}`} onPress={onOpen} style={{ position: 'relative' }}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} contentFit="cover" transition={180} style={{ width: '100%', height: 210 }} />
          ) : (
            <PhotoTile tone={tone} height={210} label={activity.name.toUpperCase()} />
          )}
          <FadeOverlay direction="bottom" intensity={0.7} transparentUntil={0.25} />
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
            <View style={{ backgroundColor: 'rgba(255,253,246,0.92)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 9, color: colors.dark, letterSpacing: 0.4 }}>
                {visibilityLabel(activity.visibility)}
              </Text>
            </View>
            {activity.cancelled_at ? (
              <View style={{ backgroundColor: colors.terracotta, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.monoBold, fontSize: 9, color: colors.white, letterSpacing: 0.4 }}>CANCELLED</Text>
              </View>
            ) : null}
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 16,
              paddingBottom: 14,
            }}
          >
            {activity.starts_at ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <TimeStampPill
                  label={planDateLabel(activity)}
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
                    {planTimeLabel(activity)}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text
              numberOfLines={2}
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
            {(location || activity.description) ? (
              <View style={{ gap: 2, marginTop: 4 }}>
                {location ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.sansSemi,
                      fontSize: 12.5,
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    {location}
                  </Text>
                ) : null}
                {activity.description ? (
                  <Text
                    numberOfLines={2}
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
        </Pressable>

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
            outConnections={outConnections}
            hasExternalListing={hasExternalListing}
          />
          <Pressable
            disabled={Boolean(activity.cancelled_at)}
            onPress={() =>
              presentInterestSheet({
                activityId: activity.id,
                activityName: activity.name,
                emoji: activity.emoji,
                currentState: myState,
                hasExternalListing,
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
              opacity: activity.cancelled_at ? 0.55 : 1,
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

function visibilityLabel(visibility: ActivitySocialProof['activity']['visibility']): string {
  if (visibility === 'connections') return 'MY VILLAGE';
  if (visibility === 'invited') return 'INVITED ONLY';
  return 'PUBLIC';
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
