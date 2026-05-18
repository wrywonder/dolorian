import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/constants';
import { Icon } from './Icon';
import { TwinkleSparkle } from './TwinkleSparkle';

type FloatingComposeProps = {
  onPress?: () => void;
  size?: number;
};

/**
 * The floating "+" compose button — terracotta circle, gently floats
 * 3px up/down on a 3.4s loop while holding a -5° tilt.
 * A twinkling butter sparkle sits in the top-right.
 */
export function FloatingCompose({ onPress, size = 64 }: FloatingComposeProps) {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [lift]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: -3 * lift.value },
      { rotate: '-5deg' },
    ],
  }));

  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Animated.View style={animated}>
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onPress?.();
          }}
          onPressIn={() => {
            press.value = withTiming(0.94, { duration: 90 });
          }}
          onPressOut={() => {
            press.value = withTiming(1, { duration: 120 });
          }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.terracotta,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#924328',
            shadowOpacity: 0.5,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 0,
            elevation: 8,
          }}
        >
          <Icon name="plus" size={size * 0.5} color={colors.white} weight={2.6} />
          <View style={{ position: 'absolute', top: 6, right: 8 }} pointerEvents="none">
            <TwinkleSparkle size={11} color={colors.amberLight} />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
