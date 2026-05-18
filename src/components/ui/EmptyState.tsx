import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { Squiggle } from './Squiggle';
import { TwinkleSparkle } from './TwinkleSparkle';

type EmptyStateProps = {
  /** Small UPPERCASE mono eyebrow. */
  eyebrow?: string;
  /** Italic-serif title — the warm hook line. */
  title: string;
  /** Sub-copy, italic-serif body. */
  body?: string;
  /** Optional sparkle / squiggle decoration alongside the title. */
  flourish?: 'sparkle' | 'squiggle' | 'none';
};

/**
 * The "nothing here yet" composition used across every tab. Warm and
 * inviting — never apologetic, never dead-end copy. Kept centered so
 * it works whether it sits in a list, a sheet, or fullscreen.
 */
export function EmptyState({
  eyebrow,
  title,
  body,
  flourish = 'sparkle',
}: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 60,
      }}
    >
      {eyebrow ? (
        <Text
          style={{
            fontFamily: fonts.monoBold,
            fontSize: 11,
            color: colors.taupe,
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: colors.dark,
            lineHeight: 30,
            letterSpacing: -0.4,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        {flourish === 'sparkle' ? (
          <TwinkleSparkle size={14} color={colors.amberLight} />
        ) : null}
      </View>
      {flourish === 'squiggle' ? (
        <View style={{ marginTop: 6 }}>
          <Squiggle width={70} color={colors.terracotta} />
        </View>
      ) : null}
      {body ? (
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 15,
            color: colors.taupe,
            lineHeight: 20,
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}
