import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { Squiggle } from './Squiggle';
import { TwinkleSparkle } from './TwinkleSparkle';

type ScreenHeaderProps = {
  /** Small all-caps mono label above the title — "SAT · MAY 24", "THIS WEEK & NEXT". */
  eyebrow?: string;
  /** Italic-serif lowercase page name — "buzz", "IRL", "plans". */
  title: string;
  /** Right-aligned slot — visibility chip on Buzz/IRL, icon button on Plans. */
  right?: React.ReactNode;
  /** "squiggle" under title (Buzz/Plans) or "sparkle" inline beside it (IRL). */
  flourish?: 'squiggle' | 'sparkle';
};

/**
 * Unified header rule — locked at Phase 1 per spec. Every tab screen
 * uses this header so vertical rhythm, scale, and flourishes are identical.
 */
export function ScreenHeader({
  eyebrow,
  title,
  right,
  flourish = 'squiggle',
}: ScreenHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? (
          <Text
            style={{
              fontFamily: fonts.monoBold,
              fontSize: 11,
              color: colors.brownMid,
              letterSpacing: 0.7,
              marginBottom: 2,
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 38,
              color: colors.dark,
              letterSpacing: -0.6,
              lineHeight: 40,
            }}
          >
            {title}
          </Text>
          {flourish === 'sparkle' ? (
            <View style={{ marginBottom: 6 }}>
              <TwinkleSparkle size={16} color={colors.amberLight} />
            </View>
          ) : null}
        </View>
        {flourish === 'squiggle' ? (
          <View style={{ marginTop: 4 }}>
            <Squiggle width={60} color={colors.terracotta} />
          </View>
        ) : null}
      </View>
      {right ? <View style={{ paddingBottom: 4 }}>{right}</View> : null}
    </View>
  );
}
