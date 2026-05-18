import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import {
  DottedUnderline,
  Icon,
  TerracottaButton,
} from '@/components/ui';
import type { Activity, Prompt } from '@/types';

type ShareAfterActivityCardProps = {
  prompt: Prompt<'share_after_activity'>;
  activity: Activity | null;
  onSnap?: () => void;
  onDismiss?: () => void;
};

/**
 * Sage-bg postcard with a pale-amber "tape" strip on top.
 * "A LITTLE NUDGE ↓" eyebrow, italic-serif prompt, sage CTA + ghost dismiss.
 *
 * Activity name gets a dashed underline (DottedUnderline). When the
 * activity is missing (deleted, etc.) we degrade gracefully.
 */
export function ShareAfterActivityCard({
  prompt: _prompt,
  activity,
  onSnap,
  onDismiss,
}: ShareAfterActivityCardProps) {
  const activityLabel = activity?.name?.toLowerCase() ?? 'this activity';
  const emoji = activity?.emoji ?? '✨';

  return (
    <View style={{ marginBottom: 22, marginTop: 12, position: 'relative' }}>
      {/* tape strip */}
      <View
        style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          marginLeft: -32,
          width: 64,
          height: 18,
          backgroundColor: 'rgba(245, 199, 126, 0.55)',
          borderRadius: 2,
          transform: [{ rotate: '-2deg' }],
          zIndex: 2,
        }}
      />

      <View
        style={{
          backgroundColor: colors.sageSoft,
          borderRadius: 20,
          padding: 16,
          paddingBottom: 14,
          borderWidth: 1,
          borderColor: '#C9D9B7',
          transform: [{ rotate: '-0.6deg' }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: colors.white,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.monoBold,
                fontSize: 11,
                color: colors.sage,
                letterSpacing: 0.6,
              }}
            >
              A LITTLE NUDGE ↓
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 19.5,
                  color: colors.dark,
                  lineHeight: 24,
                }}
              >
                Share a moment from{' '}
              </Text>
              <DottedUnderline
                color={colors.sage}
                textStyle={{
                  fontFamily: fonts.serif,
                  fontSize: 19.5,
                  color: colors.dark,
                  lineHeight: 24,
                }}
              >
                {activityLabel}
              </DottedUnderline>
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 19.5,
                  color: colors.dark,
                  lineHeight: 24,
                }}
              >
                ?
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            paddingLeft: 58,
          }}
        >
          <View style={{ position: 'relative' }}>
            <Pressable
              onPress={onSnap}
              style={{
                backgroundColor: colors.sage,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 17,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                shadowColor: '#3c5028',
                shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 0,
                elevation: 3,
              }}
            >
              <Icon name="camera" size={15} color={colors.white} weight={2.2} />
              <Text
                style={{
                  fontFamily: fonts.sansExtra,
                  fontSize: 13,
                  color: colors.white,
                }}
              >
                snap one ✨
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={onDismiss} hitSlop={10}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 14,
                color: colors.taupe,
                paddingVertical: 9,
                paddingHorizontal: 4,
              }}
            >
              not now
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
