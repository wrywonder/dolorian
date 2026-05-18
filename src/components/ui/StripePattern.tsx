import { View, type DimensionValue, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { avatarTones, type AvatarTone } from '@/lib/constants';

type StripePatternProps = {
  tone?: AvatarTone;
  /** Override the tone with a custom light/dark pair (hex). */
  colors?: { light: string; dark: string };
  width?: DimensionValue;
  height?: DimensionValue;
  /** Stripe pair width (light + dark together). Default 28. */
  stripeWidth?: number;
  /** Border radius — clips the pattern. */
  radius?: number;
  style?: ViewStyle;
};

/**
 * Diagonal stripe pattern at 45° (visually ~135° due to SVG axis flip).
 * Used as the photo-placeholder texture everywhere: post thumbnails,
 * activity card headers, profile hero, kid cards, map photo-pins.
 *
 * Stripe color pairs are hand-tuned per avatar tone for fidelity — auto
 * HSL derivation desaturates badly on mauve and slate.
 */
export function StripePattern({
  tone = 'peach',
  colors,
  width = '100%',
  height = '100%',
  stripeWidth = 28,
  radius = 0,
  style,
}: StripePatternProps) {
  const pair = colors ?? { light: avatarTones[tone].light, dark: avatarTones[tone].dark };
  const half = stripeWidth / 2;
  const patternId = `stripe-${pair.light.slice(1)}-${pair.dark.slice(1)}-${stripeWidth}`;

  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={stripeWidth}
            height={stripeWidth}
            patternTransform="rotate(45)"
          >
            <Rect x={0} width={half} height={stripeWidth} fill={pair.light} />
            <Rect x={half} width={half} height={stripeWidth} fill={pair.dark} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}
