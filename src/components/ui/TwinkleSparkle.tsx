import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Sparkle } from './Sparkle';

type TwinkleSparkleProps = {
  size?: number;
  color?: string;
  /** Start offset in ms — stagger multiple sparkles so they don't pulse in sync. */
  delay?: number;
};

/**
 * Twinkling decorative sparkle — opacity 0.55 ↔ 1 with a slight rotation
 * and scale wobble. Loops forever. Used as accent around CTAs and titles.
 */
export function TwinkleSparkle({
  size = 14,
  color = '#E8A93A',
  delay = 0,
}: TwinkleSparkleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [progress, delay]);

  const animated = useAnimatedStyle(() => {
    const opacity = 0.55 + progress.value * 0.45;
    const scale = 0.85 + progress.value * 0.25;
    const rotation = progress.value * 15;
    return {
      opacity,
      transform: [{ scale }, { rotate: `${rotation}deg` }],
    };
  });

  return (
    <Animated.View style={animated}>
      <Sparkle size={size} color={color} />
    </Animated.View>
  );
}
