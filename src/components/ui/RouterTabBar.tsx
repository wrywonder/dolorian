import { useRouter, useSegments } from 'expo-router';
import { TabBar, type TabKey } from './TabBar';

const TAB_ORDER: TabKey[] = ['buzz', 'irl', 'plans', 'you'];

type RouterTabBarProps = {
  /** Map of tab key → unread badge count. */
  badges?: Partial<Record<TabKey, number>>;
};

/**
 * Adapter between our presentational TabBar and expo-router. The TabBar
 * itself stays router-agnostic — easier to render in storybooks and tests.
 *
 * Currently reads the active tab from the URL segment; pushes a route
 * on change. Phase 7 will swap to `router.replace` for the auth gate.
 */
export function RouterTabBar({ badges }: RouterTabBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[segments.length - 1] as string | undefined;
  const active = (TAB_ORDER.find((k) => k === current) ?? 'buzz') as TabKey;

  return (
    <TabBar
      active={active}
      badges={badges}
      onChange={(key) => {
        router.replace(`/(tabs)/${key}` as never);
      }}
    />
  );
}
