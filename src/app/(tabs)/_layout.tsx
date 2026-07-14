import { useEffect } from 'react';
import { View } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/constants';
import { RouterTabBar } from '@/components/ui';
import { InterestSheetHost } from '@/components/plans/InterestSheet';
import { useVisibilityStore } from '@/store/visibility';

/**
 * Tabs group layout — every (tabs)/* route renders inside this shell.
 * We use <Slot/> instead of expo-router's <Tabs/> so we can render our
 * own custom TabBar at the bottom without expo-router's default UI.
 *
 * Tab switches cross-fade: the wrapper (not the screens) animates
 * opacity on pathname change, so screens keep their state — no remount,
 * no refetch, just a soft entrance for the incoming tab.
 */
export default function TabsLayout() {
  const pathname = usePathname();
  const opacity = useSharedValue(1);
  const rise = useSharedValue(0);

  // Pull the persisted "out & about" state once the user lands in tabs,
  // so the header chips reflect the DB instead of a hardcoded default.
  useEffect(() => {
    useVisibilityStore.getState().hydrate();
  }, []);

  useEffect(() => {
    opacity.value = 0;
    rise.value = 4;
    opacity.value = withTiming(1, { duration: 220 });
    rise.value = withTiming(0, { duration: 220 });
  }, [pathname, opacity, rise]);

  const transition = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Animated.View style={[{ flex: 1 }, transition]}>
        <Slot />
      </Animated.View>
      <RouterTabBar badges={{ buzz: 4 }} />
      <InterestSheetHost />
    </View>
  );
}
