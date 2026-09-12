import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { data } from '@/lib/data';
import { AUTO_SHARE_DELAY_MS, createPresenceQueue, isHangoutMonitoringOwner, replaceOwnedHangoutMonitoring } from '@/lib/irl-presence';
import type { HangoutSpot, ParentLocation, UUID } from '@/types';

export const HANGOUT_GEOFENCE_TASK = 'dolorian-hangout-geofences';
const SCHEDULED_PREFIX = 'hangout-scheduled:';
const SUGGESTION_KEY = 'hangout-pending-suggestion';
const SUPPRESSED_PREFIX = 'hangout-stopped:';
const MONITORING_OWNER_KEY = 'hangout-monitoring-parent';
const stoppedVisits = new Set<string>();
const runMonitoringChange = createPresenceQueue();

type RegionKind = 'mine' | 'suggested';
type PendingSuggestion = { parentId: UUID; venueId: UUID; name: string; suggestedBy: string[] };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function identifier(parentId: UUID, kind: RegionKind, venueId: UUID): string {
  return `${parentId}|${kind}|${venueId}`;
}

function parseIdentifier(value?: string): { parentId: UUID; kind: RegionKind; venueId: UUID } | null {
  const [parentId, kind, venueId] = value?.split('|') ?? [];
  if (!parentId || (kind !== 'mine' && kind !== 'suggested') || !venueId) return null;
  return { parentId, kind, venueId };
}

async function cancelNotificationKey(key: string): Promise<void> {
  const notificationId = await AsyncStorage.getItem(key);
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
    await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
  }
  await AsyncStorage.removeItem(key);
}

function countdownKey(parentId: UUID, venueId: UUID) {
  return `${SCHEDULED_PREFIX}${parentId}:${venueId}`;
}

async function ownsMonitoring(parentId: UUID): Promise<boolean> {
  const registeredOwner = await AsyncStorage.getItem(MONITORING_OWNER_KEY);
  const currentParent = await data.getCurrentParentId();
  return registeredOwner === parentId && isHangoutMonitoringOwner(registeredOwner, currentParent);
}

export async function cancelPendingHangoutNotifications(expectedParentId?: UUID): Promise<void> {
  const parentId = await data.getCurrentParentId();
  if (expectedParentId && parentId !== expectedParentId) return;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(`${SCHEDULED_PREFIX}${parentId}:`)
    // Clear old unscoped reminders, which must not survive this upgrade.
    || (key.startsWith(SCHEDULED_PREFIX) && !key.slice(SCHEDULED_PREFIX.length).includes(':')),
  );
  await Promise.all(keys.map(cancelNotificationKey));
}

/** A user who stopped a visit stays hidden until leaving that region. */
export async function stopSharingAtVenue(venueId: UUID): Promise<void> {
  const parentId = await data.getCurrentParentId();
  const key = `${SUPPRESSED_PREFIX}${parentId}:${venueId}`;
  stoppedVisits.add(key);
  // A device-storage failure must not prevent the server-side stop.
  await AsyncStorage.setItem(key, 'true').catch((cause) => console.warn('could not persist stopped visit', cause));
  await data.endHangoutVisit(venueId, parentId);
  await cancelNotificationKey(countdownKey(parentId, venueId)).catch((cause) => console.warn('could not clear arrival reminder', cause));
}

export async function shareAtVenue(venueId: UUID): Promise<ParentLocation> {
  const location = await data.checkInAtVenue(venueId);
  // Manual sharing replaces a pending automatic visit. Never announce the old one.
  await cancelPendingHangoutNotifications(location.parent_id).catch((cause) => console.warn('could not clear arrival reminder', cause));
  return location;
}

async function notifyAutoCountdown(spot: HangoutSpot, parentId: UUID): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    throw new Error('Auto sharing is paused until notifications are allowed.');
  }
  await cancelNotificationKey(countdownKey(parentId, spot.venue.id));
  if (!await ownsMonitoring(parentId)) throw new Error('Your account changed. Automatic sharing was not started.');
  // Schedule only the warning. A later local notification cannot verify that
  // the visit is still active, so it must not claim sharing has succeeded.
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `You’re at ${spot.venue.name} ${spot.venue.emoji ?? ''}`.trim(),
      body: `Still here in ${AUTO_SHARE_DELAY_MS / 60_000} minutes? Your connections can see this visit. Open IRL to stop sharing.`,
      data: { url: 'dolorian://irl', venueId: spot.venue.id },
    },
    trigger: null,
  });
  try {
    if (!await ownsMonitoring(parentId)) throw new Error('Your account changed. Automatic sharing was not started.');
    await AsyncStorage.setItem(countdownKey(parentId, spot.venue.id), notificationId);
  } catch (cause) {
    await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
    throw cause;
  }
}

async function notifySuggestedSpot(spot: HangoutSpot, parentId: UUID): Promise<void> {
  if (!await ownsMonitoring(parentId)) return;
  const suggestion: PendingSuggestion = {
    parentId,
    venueId: spot.venue.id,
    name: spot.venue.name,
    suggestedBy: spot.suggested_by,
  };
  await AsyncStorage.setItem(`${SUGGESTION_KEY}:${parentId}`, JSON.stringify(suggestion));
  const byline = spot.suggested_by.length > 0 ? ` It’s a favorite of ${spot.suggested_by.join(' and ')}.` : '';
  if (!await ownsMonitoring(parentId)) return;
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New hangout spot? ✨',
      body: `You’re at ${spot.venue.name}.${byline} Add it to your Auto places?`,
      data: { url: 'dolorian://irl', venueId: spot.venue.id },
    },
    trigger: null,
  });
  if (!await ownsMonitoring(parentId)) await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
}

TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>(HANGOUT_GEOFENCE_TASK, async ({ data: event, error }) => {
  if (error || !event) return;
  const parsed = parseIdentifier(event.region.identifier);
  if (!parsed) return;
  try {
    const parentId = await data.getCurrentParentId();
    const registeredOwner = await AsyncStorage.getItem(MONITORING_OWNER_KEY);
    if (parsed.parentId !== parentId || !isHangoutMonitoringOwner(registeredOwner, parentId)) return;
    const suppressedKey = `${SUPPRESSED_PREFIX}${parentId}:${parsed.venueId}`;
    // Process exits even when a hangout has just been removed from the list.
    if (event.eventType === Location.GeofencingEventType.Exit) {
      if (!await ownsMonitoring(parentId)) return;
      if (parsed.kind === 'mine') await data.endHangoutVisit(parsed.venueId, parentId);
      await cancelNotificationKey(countdownKey(parentId, parsed.venueId));
      stoppedVisits.delete(suppressedKey);
      await AsyncStorage.removeItem(suppressedKey);
      return;
    }
    const spots = await data.getHangoutSpots();
    const spot = spots.find((item) => item.venue.id === parsed.venueId);
    if (!spot) return;
    if (parsed.kind === 'suggested') {
      if (!spot.is_mine) await notifySuggestedSpot(spot, parentId);
      return;
    }
    // Re-check current ownership: an old registered region may have been disabled.
    if (!spot.is_mine || stoppedVisits.has(suppressedKey) || await AsyncStorage.getItem(suppressedKey)) return;
    await data.beginHangoutVisit(parsed.venueId, parentId, {
      show: () => notifyAutoCountdown(spot, parentId),
      cancel: () => cancelNotificationKey(countdownKey(parentId, parsed.venueId)),
      canStart: async () => {
        const suppressed = await AsyncStorage.getItem(suppressedKey);
        return !stoppedVisits.has(suppressedKey) && !suppressed && await ownsMonitoring(parentId);
      },
    });
  } catch (cause) {
    console.warn('hangout geofence event failed', cause);
  }
});

export async function configureHangoutMonitoring(): Promise<void> {
  const parentId = await data.getCurrentParentId();
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Choose “Allow While Using App” so Village can recognize hangout spots.');
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Choose “Always” in Location settings to use Auto sharing.');
  }
  const notification = await Notifications.requestPermissionsAsync();
  if (notification.status !== Notifications.PermissionStatus.GRANTED) {
    throw new Error('Turn on notifications so Village can warn you before sharing.');
  }

  await replaceMonitoring(parentId);
}

async function replaceMonitoring(parentId: UUID): Promise<void> {
  await runMonitoringChange(() => replaceOwnedHangoutMonitoring({
    clearOwner: () => AsyncStorage.removeItem(MONITORING_OWNER_KEY),
    isSameAccount: async () => (await data.getCurrentParentId()) === parentId,
    replaceRegions: async () => {
      // Callers may hold a place list fetched before an account switch. Load it
      // under this registration's identity before granting automatic sharing.
      const spots = await data.getHangoutSpots();
      if (await data.getCurrentParentId() !== parentId) throw new Error('Your account changed. Please set up sharing again.');
      await updateRegions(spots, parentId);
    },
    claimOwner: () => AsyncStorage.setItem(MONITORING_OWNER_KEY, parentId),
  }));
}

async function updateRegions(spots: HangoutSpot[], parentId: UUID): Promise<void> {
  const regions: Location.LocationRegion[] = spots
    .filter((spot) => spot.is_mine || spot.suggested_by.length > 0)
    .slice(0, 20)
    .map((spot) => ({
      identifier: identifier(parentId, spot.is_mine ? 'mine' : 'suggested', spot.venue.id),
      latitude: spot.venue.lat,
      longitude: spot.venue.lng,
      radius: spot.venue.geofence_radius_m,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));
  if (regions.length === 0) {
    if (await Location.hasStartedGeofencingAsync(HANGOUT_GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(HANGOUT_GEOFENCE_TASK);
    }
    return;
  }
  await Location.startGeofencingAsync(HANGOUT_GEOFENCE_TASK, regions);
}

export async function getHangoutMonitoringStatus(): Promise<boolean> {
  const [registeredOwner, parentId] = await Promise.all([
    AsyncStorage.getItem(MONITORING_OWNER_KEY), data.getCurrentParentId(),
  ]);
  if (!isHangoutMonitoringOwner(registeredOwner, parentId)) return false;
  const [started, background, notification] = await Promise.all([
    Location.hasStartedGeofencingAsync(HANGOUT_GEOFENCE_TASK),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  return started && background.status === Location.PermissionStatus.GRANTED
    && notification.status === Notifications.PermissionStatus.GRANTED && await ownsMonitoring(parentId);
}

export async function refreshHangoutMonitoring(): Promise<void> {
  const parentId = await data.getCurrentParentId();
  if (await getHangoutMonitoringStatus()) await replaceMonitoring(parentId);
}

export async function takePendingHangoutSuggestion(): Promise<PendingSuggestion | null> {
  const parentId = await data.getCurrentParentId();
  const key = `${SUGGESTION_KEY}:${parentId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  await AsyncStorage.removeItem(key);
  try {
    const suggestion = JSON.parse(raw) as PendingSuggestion;
    return suggestion.parentId === parentId && (await data.getCurrentParentId()) === parentId ? suggestion : null;
  } catch {
    return null;
  }
}
