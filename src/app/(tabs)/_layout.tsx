import { View } from 'react-native';
import { Slot } from 'expo-router';
import { colors } from '@/lib/constants';
import { RouterTabBar } from '@/components/ui';
import { InterestSheetHost } from '@/components/plans/InterestSheet';

/**
 * Tabs group layout — every (tabs)/* route renders inside this shell.
 * We use <Slot/> instead of expo-router's <Tabs/> so we can render our
 * own custom TabBar at the bottom without expo-router's default UI.
 */
export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Slot />
      <RouterTabBar badges={{ buzz: 4 }} />
      <InterestSheetHost />
    </View>
  );
}
