import { Text, View, type ViewStyle } from 'react-native';
import { fonts, type AvatarTone } from '@/lib/constants';
import { StripePattern } from './StripePattern';

type PhotoTileProps = {
  tone?: AvatarTone;
  height: number;
  /** Mono-font label centered in the tile (e.g. "THEO'S FIRST GOAL ⚽"). */
  label?: string;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Rectangular striped photo placeholder for post images, activity card
 * headers, and the "warming up" venue tiles. The mono caption mimics
 * the JSX prototype's design-time labels — production swaps for Image.
 */
export function PhotoTile({ tone = 'peach', height, label, radius = 0, style }: PhotoTileProps) {
  return (
    <View
      style={[
        { width: '100%', height, borderRadius: radius, overflow: 'hidden' },
        style,
      ]}
    >
      <StripePattern tone={tone} radius={radius} />
      {label ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: 'rgba(0,0,0,0.55)',
              letterSpacing: 0.2,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
