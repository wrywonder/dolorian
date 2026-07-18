import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { data } from '@/lib/data';
import type { HangoutSpot, UUID } from '@/types';

export const HANGOUT_GEOFENCE_TASK = 'dolorian-hangout-geofences';
const SCHEDULED_PREFIX = 'hangout-scheduled:';
const SUGGESTION_KEY = 'hangout-pending-suggestion';

type RegionKind = 'mine' | 'suggested';
type PendingSuggestion = { venueId: UUID; name: string; suggestedBy: string[] };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function identifier(kind: RegionKind, venueId: UUID): string {
  return `${kind}|${venueId}`;
}

function parseIdentifier(value?: string): { kind: RegionKind; venueId: UUID } | null {
  const [kind, venueId] = value?.split('|') ?? [];
  if ((kind !== 'mine' && kind !== 'suggested') || !venueId) return null;
  return { kind, venueId };
}

async function cancelCountdown(venueId: UUID): Promise<void> {
  const key = `${SCHEDULED_PREFIX}${venueId}`;
  const notificationId = await AsyncStorage.getItem(key);
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
  await AsyncStorage.removeItem(key);
}

async function notifyAutoCountdown(spot: HangoutSpot): Promise<void> {
  await cancelCountdown(spot.venue.id);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You’re at ${spot.venue.name} ${spot.venue.emoji ?? ''}`.trim(),
      body: 'Still here in 5 minutes? We’ll let your village know you’re out & about.',
      data: { url: 'dolorian://irl', venueId: spot.venue.id },
    },
    trigger: null,
  });
  const scheduledId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'You’re out & about',
      body: `Your village can now see you at ${spot.venue.name}.`,
      data: { url: 'dolorian://irl', venueId: spot.venue.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5 * 60,
    },
  });
  await AsyncStorage.setItem(`${SCHEDULED_PREFIX}${spot.venue.id}`, scheduledId);
}

async function notifySuggestedSpot(spot: HangoutSpot): Promise<void> {
  const suggestion: PendingSuggestion = {
    venueId: spot.venue.id,
    name: spot.venue.name,
    suggestedBy: spot.suggested_by,
  };
  await AsyncStorage.setItem(SUGGESTION_KEY, JSON.stringify(suggestion));
  const byline = spot.suggested_by.length > 0 ? ` It’s a favorite of ${spot.suggested_by.join(' and ')}.` : '';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New hangout spot? ✨',
      body: `You’re at ${spot.venue.name}.${byline} Add it to your Auto places?`,
      data: { url: 'dolorian://irl', venueId: spot.venue.id },
    },
    trigger: null,
  });
}

TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>(HANGOUT_GEOFENCE_TASK, async ({ data: event, error }) => {
  if (error || !event) return;
  const parsed = parseIdentifier(event.region.identifier);
  if (!parsed) return;
  try {
    const spots = await data.getHangoutSpots();
    const spot = spots.find((item) => item.venue.id === parsed.venueId);
    if (!spot) return;
    if (event.eventType === Location.GeofencingEventType.Exit) {
      if (parsed.kind === 'mine') await data.endHangoutVisit(parsed.venueId);
      await cancelCountdown(parsed.venueId);
      return;
    }
    if (parsed.kind === 'suggested') {
      await notifySuggestedSpot(spot);
      return;
    }
    const mode = await data.beginHangoutVisit(parsed.venueId);
    if (mode === 'auto') await notifyAutoCountdown(spot);
    if (mode === 'on') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'You’re out & about',
          body: `Your village can see you at ${spot.venue.name}.`,
          data: { url: 'dolorian://irl', venueId: spot.venue.id },
        },
        trigger: null,
      });
    }
  } catch (cause) {
    console.warn('hangout geofence event failed', cause);
  }
});

export async function configureHangoutMonitoring(spots: HangoutSpot[]): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Choose “Allow While Using App” so Dolorian can recognize hangout spots.');
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Choose “Always” in Location settings to use Auto sharing.');
  }
  const notification = await Notifications.requestPermissionsAsync();
  if (notification.status !== Notifications.PermissionStatus.GRANTED) {
    throw new Error('Turn on notifications so Dolorian can warn you before sharing.');
  }

  const regions: Location.LocationRegion[] = spots
    .filter((spot) => spot.is_mine || spot.suggested_by.length > 0)
    .slice(0, 20)
    .map((spot) => ({
      identifier: identifier(spot.is_mine ? 'mine' : 'suggested', spot.venue.id),
      latitude: spot.venue.lat,
      longitude: spot.venue.lng,
      radius: spot.venue.geofence_radius_m,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));
  await Location.startGeofencingAsync(HANGOUT_GEOFENCE_TASK, regions);
}

export async function getHangoutMonitoringStatus(): Promise<boolean> {
  const [started, background] = await Promise.all([
    Location.hasStartedGeofencingAsync(HANGOUT_GEOFENCE_TASK),
    Location.getBackgroundPermissionsAsync(),
  ]);
  return started && background.status === Location.PermissionStatus.GRANTED;
}

export async function refreshHangoutMonitoring(spots: HangoutSpot[]): Promise<void> {
  if (await getHangoutMonitoringStatus()) await configureHangoutMonitoring(spots);
}

export async function takePendingHangoutSuggestion(): Promise<PendingSuggestion | null> {
  const raw = await AsyncStorage.getItem(SUGGESTION_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(SUGGESTION_KEY);
  try {
    return JSON.parse(raw) as PendingSuggestion;
  } catch {
    return null;
  }
}
