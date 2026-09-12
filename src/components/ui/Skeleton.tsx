import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '@/lib/constants';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Subtle pulsing rectangle for loading placeholders. Opacity loops
 * 0.6 ↔ 1 on a 1.4s sine — matches the warm aesthetic without flashing.
 */
export function Skeleton({ width = '100%', height = 18, radius = 8, style }: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.6 + progress.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        animated,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.rule,
        },
        style,
      ]}
    />
  );
}

type SkeletonCircleProps = { size: number; style?: ViewStyle };

export function SkeletonCircle({ size, style }: SkeletonCircleProps) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

/** Generic feed card skeleton — used in Buzz's loading state. */
export function PostCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        padding: 10,
        paddingBottom: 14,
        borderRadius: 6,
        marginBottom: 24,
      }}
    >
      <Skeleton width="100%" height={300} radius={2} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingTop: 12,
          paddingHorizontal: 4,
        }}
      >
        <SkeletonCircle size={30} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="70%" height={11} />
        </View>
      </View>
    </View>
  );
}

/** Activity card skeleton — used in Plans. */
export function ActivityCardSkeleton() {
  return (
    <View accessibilityLabel="Loading plan" style={{ borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}>
      <Skeleton height={8} radius={0} />
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton width="62%" height={12} />
        <Skeleton width="80%" height={28} />
        <Skeleton width="55%" height={14} />
        <Skeleton width="66%" height={12} />
      </View>
      <View style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.rule }}>
        <SkeletonCircle size={24} />
        <View style={{ flex: 1 }}><Skeleton width="60%" height={13} /></View>
        <Skeleton width={88} height={44} radius={radii.pill} />
      </View>
    </View>
  );
}
