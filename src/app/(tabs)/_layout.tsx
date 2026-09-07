import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import * as Notifications from 'expo-notifications';
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
import { data } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { registerConnectionPushToken } from '@/lib/connection-push';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';

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
  const myId = useCurrentParentId();
  const [villageBadge, setVillageBadge] = useState(0);
  const deliveredNotificationIds = useRef(new Set<string>());
  const opacity = useSharedValue(1);
  const rise = useSharedValue(0);

  // Pull the persisted "out & about" state once the user lands in tabs,
  // so the header chips reflect the DB instead of a hardcoded default.
  useEffect(() => {
    useVisibilityStore.getState().hydrate();
    registerConnectionPushToken().catch((cause) => {
      console.warn('push registration failed', cause);
    });
  }, []);

  const refreshVillageBadge = useCallback(() => {
    data.getIncomingConnectionCount()
      .then(setVillageBadge)
      .catch(() => setVillageBadge(0));
  }, []);

  const deliverConnectionNotification = useCallback(async (notification: {
    id: string;
    title: string;
    body: string;
    url: string;
  }) => {
    if (deliveredNotificationIds.current.has(notification.id)) return;
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== Notifications.PermissionStatus.GRANTED) return;
    deliveredNotificationIds.current.add(notification.id);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { url: notification.url },
        },
        trigger: null,
      });
      await supabase
        .from('connection_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id);
    } catch (cause) {
      deliveredNotificationIds.current.delete(notification.id);
      console.warn('connection notification delivery failed', cause);
    }
  }, []);

  const deliverUnreadConnectionNotifications = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from('connection_notifications')
      .select('id, title, body, url')
      .is('read_at', null)
      .is('push_sent_at', null)
      .lt('created_at', new Date(Date.now() - 5_000).toISOString())
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;
    for (const row of rows ?? []) await deliverConnectionNotification(row);
  }, [deliverConnectionNotification]);

  useEffect(() => {
    if (!myId) return;
    refreshVillageBadge();
    void deliverUnreadConnectionNotifications().catch((cause) => {
      console.warn('connection notification sync failed', cause);
    });
    const channel = supabase
      .channel(`village-badge-${myId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'connections', filter: `parent_a=eq.${myId}`,
      }, refreshVillageBadge)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'connections', filter: `parent_b=eq.${myId}`,
      }, refreshVillageBadge)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'connection_notifications', filter: `recipient_id=eq.${myId}`,
      }, () => {
        // Give the remote delivery function time to claim the notification.
        // If no registered device received it, the local foreground fallback
        // will still surface it on the next sync.
        setTimeout(() => {
          void deliverUnreadConnectionNotifications().catch((cause) => {
            console.warn('connection notification sync failed', cause);
          });
        }, 6_000);
      })
      .subscribe();
    const refresh = () => {
      refreshVillageBadge();
      void deliverUnreadConnectionNotifications().catch((cause) => {
        console.warn('connection notification sync failed', cause);
      });
    };
    const interval = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [deliverConnectionNotification, deliverUnreadConnectionNotifications, myId, refreshVillageBadge]);

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
      <RouterTabBar badges={{ you: villageBadge }} />
      <InterestSheetHost />
    </View>
  );
}
