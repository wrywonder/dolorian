import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type PulseDotProps = {
  size?: number;
  color?: string;
  style?: ViewStyle;
};

/**
 * The "out & about" liveness indicator — a solid colored dot with a
 * pulsing ring that scales 1 → 2.6 over 2.2s.
 */
export function PulseDot({ size = 9, color = '#E8A93A', style }: PulseDotProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => {
    const opacity = 0.5 - progress.value * 0.5;
    const scale = 1 + progress.value * 1.6;
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
    </View>
  );
}
