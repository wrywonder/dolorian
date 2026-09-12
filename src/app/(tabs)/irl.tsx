import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, fonts, radii, spacing, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import { createLatestRequest } from '@/lib/latest-request';
import { hasActiveVisit, isPresenceVisible } from '@/lib/irl-presence';
import { ScreenHeader, Skeleton, VisibilityChip } from '@/components/ui';
import { AddSpotSheet } from '@/components/irl/AddSpotSheet';
import { CheckInSheet } from '@/components/irl/CheckInSheet';
import { LiveMap } from '@/components/irl/LiveMap';
import { WarmingUpStrip } from '@/components/irl/WarmingUpStrip';
import { useVisibilityStore } from '@/store/visibility';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import {
  configureHangoutMonitoring, getHangoutMonitoringStatus, refreshHangoutMonitoring,
  shareAtVenue, stopSharingAtVenue, takePendingHangoutSuggestion,
} from '@/lib/hangout-geofencing';
import type { HangoutSpot, NearbyParent, Venue, VisibilityMode } from '@/types';

const MODE_COPY: Record<VisibilityMode, { title: string; body: string }> = {
  on: { title: 'On arrival', body: 'Share immediately when you arrive at an enabled hangout.' },
  auto: { title: 'After 5 min', body: 'Get a warning first. Share if you’re still there 5 minutes later.' },
  disabled: { title: 'Off', body: 'Share only when you choose “I’m here”. No automatic check-ins.' },
};

export default function IrlScreen() {
  const mode = useVisibilityStore((state) => state.mode);
  const visible = useVisibilityStore((state) => state.visible);
  const myLocation = useVisibilityStore((state) => state.location);
  const myVenue = useVisibilityStore((state) => state.venue);
  const modeSaving = useVisibilityStore((state) => state.saving);
  const myId = useCurrentParentId();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pins, setPins] = useState<NearbyParent[]>([]);
  const [spots, setSpots] = useState<HangoutSpot[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [addSpotOpen, setAddSpotOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const requests = useRef(createLatestRequest()).current;
  const mutationBusy = useRef(false);
  const addThenShare = useRef(false);

  const load = useCallback(async () => {
    if (mutationBusy.current) return;
    const isCurrent = requests.begin();
    const isSameAccount = useVisibilityStore.getState().captureIdentity();
    try {
      const [near, hangouts, presence, active] = await Promise.all([
        data.getNearbyParents(), data.getHangoutSpots(), data.getMyVisibility(),
        getHangoutMonitoringStatus().catch(() => false),
      ]);
      if (!isCurrent() || !isSameAccount()) return;
      setPins(near);
      setSpots(hangouts);
      setMonitoring(active);
      useVisibilityStore.getState().accept(presence);
      setNow(Date.now());
      setLastUpdated(Date.now());
      setError(null);
    } catch (cause) {
      if (isCurrent()) setError(readableError(cause, 'Could not refresh IRL. Pull down to try again.'));
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  }, [requests]);
  const invalidate = useCallback(() => { requests.invalidate(); }, [requests]);
  useRefreshOnFocus(load, invalidate);

  useFocusEffect(useCallback(() => {
    // Polling also catches the server's time-based auto-share transition, which
    // emits no database change event. Never poll while the app is backgrounded.
    const refreshTimer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 30_000);
    const expiryTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        setNow(Date.now());
        useVisibilityStore.getState().tick();
      }
    }, 5_000);
    return () => { clearInterval(refreshTimer); clearInterval(expiryTimer); };
  }, [load]));

  useFocusEffect(useCallback(() => {
    let active = true;
    void takePendingHangoutSuggestion().then((suggestion) => {
      if (!active || !suggestion) return;
      Alert.alert('A new favorite?', `Save ${suggestion.name} as one of your hangouts?`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Save hangout', onPress: () => {
          void data.setHangoutSpot(suggestion.venueId, true)
            .then(refreshHangoutMonitoring)
            .then(load)
            .catch((cause: unknown) => setError(readableError(cause, 'Could not save that hangout.')));
        } },
      ]);
    }).catch(() => {});
    return () => { active = false; };
  }, [load]));

  const activePins = useMemo(() => pins.filter((pin) => isPresenceVisible(pin.location, now)), [pins, now]);
  const friends = activePins.filter((pin) => pin.parent.id !== myId);
  const ownSpots = spots.filter((spot) => spot.is_mine);
  const suggestedSpots = spots.filter((spot) => !spot.is_mine && spot.suggested_by.length > 0);
  const venues = useMemo(() => {
    const byId = new Map<string, Venue>();
    for (const spot of spots) byId.set(spot.venue.id, spot.venue);
    for (const pin of pins) if (pin.venue) byId.set(pin.venue.id, pin.venue);
    if (selectedVenue) byId.set(selectedVenue.id, selectedVenue);
    return [...byId.values()];
  }, [spots, pins, selectedVenue]);
  const countAt = (venue: Venue) => friends.filter((pin) => pin.venue?.id === venue.id).length;
  const activeVisit = hasActiveVisit(myLocation, now) && myVenue;
  const sharingNow = isPresenceVisible(myLocation, now);
  const pendingMinutes = myLocation?.auto_share_at ? Math.max(1, Math.ceil((Date.parse(myLocation.auto_share_at) - now) / 60_000)) : null;

  const openCheckIn = (venue: Venue | null = null) => {
    setSelectedVenue(venue);
    setShareError(null);
    setCheckInOpen(true);
  };

  const updateMode = async (next: VisibilityMode) => {
    if (mutationBusy.current || modeSaving || next === mode) return;
    mutationBusy.current = true;
    requests.invalidate();
    try {
      await useVisibilityStore.getState().setMode(next);
      setActionError(null);
    } catch (cause) {
      setActionError(readableError(cause, 'Could not update automatic sharing.'));
    } finally {
      mutationBusy.current = false;
      void load();
    }
  };

  const checkIn = async (venue: Venue) => {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    requests.invalidate();
    setActionBusy(true);
    setShareError(null);
    const isSameAccount = useVisibilityStore.getState().captureIdentity();
    try {
      const location = await shareAtVenue(venue.id);
      if (!isSameAccount()) return;
      // The same write response confirms the exact active visit. A failed map
      // refresh must never hide the stop control for a successfully shared visit.
      useVisibilityStore.getState().accept({ mode: useVisibilityStore.getState().mode, visible: true, location, venue });
      setNow(Date.now());
      setCheckInOpen(false);
      setActionError(null);
    } catch (cause) {
      setShareError(readableError(cause, 'Could not share your visit. Try again.'));
    } finally {
      mutationBusy.current = false;
      setActionBusy(false);
      void load();
    }
  };

  const stopVisit = async () => {
    if (!myLocation?.venue_id || mutationBusy.current) return;
    mutationBusy.current = true;
    requests.invalidate();
    setActionBusy(true);
    const isSameAccount = useVisibilityStore.getState().captureIdentity();
    try {
      await stopSharingAtVenue(myLocation.venue_id);
      if (!isSameAccount()) return;
      // The write succeeded; clear the local card even if the refresh is offline.
      useVisibilityStore.getState().accept({ mode, visible: false, location: null, venue: null });
      setPins((current) => current.filter((pin) => pin.parent.id !== myId));
      setActionError(null);
    } catch (cause) {
      setActionError(readableError(cause, 'Could not stop sharing. Please try again.'));
    } finally {
      mutationBusy.current = false;
      setActionBusy(false);
      void load();
    }
  };

  const enableAutomatic = async () => {
    setSetupBusy(true);
    try {
      await configureHangoutMonitoring();
      setMonitoring(await getHangoutMonitoringStatus());
      setActionError(null);
    } catch (cause) {
      setActionError(readableError(cause, 'Could not enable automatic sharing. You can still share a visit manually.'));
    } finally { setSetupBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader eyebrow="YOUR VILLAGE, RIGHT NOW" title="IRL" flourish="sparkle" right={
        <VisibilityChip visible={visible} mode={mode} visibleParents={friends.slice(0, 3).map(({ parent }) => ({ initials: '', tone: parent.avatar_color as AvatarTone, imageUrl: parent.avatar_url }))} />
      } />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.terracotta} />} contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 130 }}>
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.sageSoft, borderWidth: 1, borderColor: colors.sage }}>
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: colors.brownMid }}>{activeVisit ? sharingNow ? 'YOU’RE ON THE MAP' : 'A LITTLE HEADS-UP' : 'ROOM FOR ONE MORE?'}</Text>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, color: colors.dark, paddingTop: spacing.xs }}>
            {activeVisit ? `${myVenue.emoji ?? '📍'} ${myVenue.name}` : 'a little company?'}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.brownMid, paddingTop: spacing.sm }}>
            {activeVisit
              ? sharingNow
                ? `Your connections can see this visit until ${new Date(myLocation!.expires_at!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Head out anytime.`
                : `Your connections can see you here in about ${pendingMinutes} ${pendingMinutes === 1 ? 'minute' : 'minutes'}. You can stop this visit below.`
              : 'At a park, playground, or your usual spot? Let your connections know they can join you.'}
          </Text>
          <Pressable accessibilityRole="button" disabled={actionBusy || modeSaving || loading} accessibilityState={{ disabled: actionBusy || modeSaving || loading, busy: actionBusy }} onPress={activeVisit ? stopVisit : () => openCheckIn()} style={{ marginTop: spacing.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: activeVisit ? colors.surface : colors.terracotta, opacity: actionBusy || loading ? 0.55 : 1 }}>
            <Text style={{ fontFamily: fonts.sansExtra, fontSize: 14, color: activeVisit ? colors.dark : colors.white }}>{actionBusy ? 'one moment…' : activeVisit ? sharingNow ? 'I’m heading out' : 'stop this visit' : 'I’m here · come join →'}</Text>
          </Pressable>
          {!activeVisit ? <Text style={{ fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.brownMid, paddingTop: spacing.sm, textAlign: 'center' }}>One visit · up to 2 hours · no background location needed</Text> : null}
        </View>

        {actionError ? <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
          <Text accessibilityRole="alert" selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>{actionError}</Text>
        </View> : null}
        {error ? <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
          <Text accessibilityRole="alert" selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>{error}{lastUpdated ? ' Showing the last update; some visits may have ended.' : ''}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansBold, color: colors.terracotta }}>try again →</Text></Pressable>
        </View> : null}

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.serif, fontSize: 23, color: colors.dark }}>out & about</Text>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.brownMid }}>{error ? 'LAST UPDATE' : friends.length ? `${friends.length} ${friends.length === 1 ? 'FRIEND' : 'FRIENDS'} HERE` : 'A QUIET MOMENT'}</Text>
        </View>
        {loading ? <View style={{ marginHorizontal: spacing.md, height: 280 }}><Skeleton width="100%" height="100%" radius={radii.lg} /></View>
          : lastUpdated ? <View style={{ height: 280 }}><LiveMap pins={activePins} venues={venues} meId={myId ?? ''} /></View>
            : <View style={{ marginHorizontal: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg }}><Text style={{ fontFamily: fonts.sans, color: colors.brownMid }}>The map will be here when we reconnect.</Text></View>}

        <WarmingUpStrip title="your hangout spots" items={ownSpots.map((spot) => ({ venue: spot.venue, count: countAt(spot.venue) }))} onPressVenue={(venue) => openCheckIn(venue)} />
        {suggestedSpots.length > 0 ? <WarmingUpStrip title="friends’ favorites" items={suggestedSpots.map((spot) => ({ venue: spot.venue, count: countAt(spot.venue) }))} onPressVenue={(venue) => openCheckIn(venue)} /> : null}

        <View style={{ margin: spacing.md, marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>automatic sharing</Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid, paddingTop: spacing.xs }}>Optional, for your regular hangouts.</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md }}>
            {(Object.keys(MODE_COPY) as VisibilityMode[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`Automatic sharing ${MODE_COPY[item].title}`} accessibilityState={{ checked: mode === item, disabled: modeSaving || actionBusy }} disabled={modeSaving || actionBusy} onPress={() => void updateMode(item)} style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center', backgroundColor: mode === item ? colors.terracotta : colors.cream }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 11, textAlign: 'center', color: mode === item ? colors.white : colors.dark }}>{MODE_COPY[item].title}</Text></Pressable>)}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid, paddingTop: spacing.sm }}>{MODE_COPY[mode].body}</Text>
          {mode !== 'disabled' && !monitoring ? <View style={{ paddingTop: spacing.sm }}>
            <Pressable accessibilityRole="button" disabled={setupBusy || loading} onPress={enableAutomatic} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta }}>{setupBusy ? 'opening permissions…' : 'set up automatic sharing →'}</Text></Pressable>
            <Text style={{ fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, color: colors.brownMid }}>Needs Always location and notifications. Manual visits work without these.</Text>
            {actionError ? <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta }}>open device settings →</Text></Pressable> : null}
          </View> : null}
        </View>
      </ScrollView>
      <CheckInSheet open={checkInOpen} venues={venues} initialVenue={selectedVenue} busy={actionBusy} error={shareError} onClose={() => setCheckInOpen(false)} onShare={checkIn} onAddPlace={() => { addThenShare.current = true; setCheckInOpen(false); setAddSpotOpen(true); }} />
      <AddSpotSheet open={addSpotOpen} onClose={() => setAddSpotOpen(false)} onCreated={async (venue) => {
        setAddSpotOpen(false);
        if (addThenShare.current) { addThenShare.current = false; openCheckIn(venue); }
        try {
          const next = await data.getHangoutSpots();
          setSpots(next);
          await refreshHangoutMonitoring();
          await load();
        } catch (cause) { setError(readableError(cause, 'Place saved. Could not refresh hangouts yet.')); }
      }} />
    </SafeAreaView>
  );
}
