import { useEffect } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/lib/constants';
import { Sparkle } from './Sparkle';

type Variant = 'primary' | 'compact';

type TerracottaButtonProps = {
  label: string;
  onPress?: () => void;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: Variant;
  /** Renders 3 sparkle accents around the button (Hannah's Connect CTA). */
  withConfetti?: boolean;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  style?: ViewStyle;
  fullWidth?: boolean;
};

/**
 * The primary CTA across the app — Connect, "I'm in →", "snap one ✨".
 *
 * Visual rules:
 *  - terracotta fill, white bold text, pill radius
 *  - 3px hard-bottom shadow + soft glow (the "stacked" look)
 *  - scales down briefly on press for tactile feedback
 *  - optional sparkle confetti around the perimeter for hero moments
 */
export function TerracottaButton({
  label,
  onPress,
  iconLeft,
  iconRight,
  variant = 'primary',
  withConfetti = false,
  disabled = false,
  haptic = 'light',
  style,
  fullWidth = false,
}: TerracottaButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(disabled ? 0.55 : 1);

  useEffect(() => {
    opacity.value = withTiming(disabled ? 0.55 : 1, { duration: 150 });
  }, [disabled, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 280 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 240 });
  };
  const handlePress = () => {
    if (disabled) return;
    if (haptic !== 'none') {
      const style =
        haptic === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : haptic === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {});
    }
    onPress?.();
  };

  const isCompact = variant === 'compact';

  return (
    <View style={[{ position: 'relative', alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={disabled}
          style={{
            height: isCompact ? 38 : 58,
            paddingHorizontal: isCompact ? 18 : 28,
            borderRadius: isCompact ? 14 : 29,
            backgroundColor: colors.terracotta,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: '#924328',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 0,
            elevation: 6,
          }}
        >
          {iconLeft}
          <Text
            style={{
              fontFamily: fonts.sansExtra,
              fontSize: isCompact ? 13 : 17,
              color: colors.white,
              letterSpacing: -0.2,
            }}
          >
            {label}
          </Text>
          {iconRight}
        </Pressable>
      </Animated.View>

      {withConfetti ? (
        <>
          <View style={{ position: 'absolute', top: -5, left: 22 }} pointerEvents="none">
            <Sparkle size={15} color={colors.amberLight} />
          </View>
          <View style={{ position: 'absolute', top: 6, right: 32 }} pointerEvents="none">
            <Sparkle size={11} color={colors.terracotta} />
          </View>
          <View style={{ position: 'absolute', bottom: -5, right: 88 }} pointerEvents="none">
            <Sparkle size={13} color={colors.sage} />
          </View>
        </>
      ) : null}
    </View>
  );
}
