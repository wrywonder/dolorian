import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type FadeOverlayProps = {
  /** Direction the dark stop sits — defaults to 'bottom'. */
  direction?: 'bottom' | 'top';
  /** Opacity 0-1 of the darkest stop. */
  intensity?: number;
  /** Fraction of the gradient that is fully transparent (0-1). */
  transparentUntil?: number;
  style?: ViewStyle;
};

/**
 * Translucent black gradient overlay rendered via react-native-svg —
 * used over photo tiles in activity cards and post images so white
 * caption text reads clearly against any tone.
 */
export function FadeOverlay({
  direction = 'bottom',
  intensity = 0.7,
  transparentUntil = 0.25,
  style,
}: FadeOverlayProps) {
  const [start, end] =
    direction === 'bottom'
      ? [{ x: '0', y: '0' }, { x: '0', y: '1' }]
      : [{ x: '0', y: '1' }, { x: '0', y: '0' }];
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="fade" x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
            <Stop offset={transparentUntil} stopColor="#000" stopOpacity={0} />
            <Stop offset={1} stopColor="#000" stopOpacity={intensity} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  );
}
