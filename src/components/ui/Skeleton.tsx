import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/constants';

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
    <View
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 26,
        backgroundColor: colors.surface,
      }}
    >
      <Skeleton width="100%" height={210} radius={0} />
      <View
        style={{
          padding: 13,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <SkeletonCircle size={28} />
          <SkeletonCircle size={28} style={{ marginLeft: -10 }} />
          <SkeletonCircle size={28} style={{ marginLeft: -10 }} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="80%" height={13} />
        </View>
        <Skeleton width={80} height={32} radius={14} />
      </View>
    </View>
  );
}
