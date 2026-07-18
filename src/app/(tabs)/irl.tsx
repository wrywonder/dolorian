import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, fonts, radii, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { ScreenHeader, Skeleton, VisibilityChip } from '@/components/ui';
import { AddSpotSheet } from '@/components/irl/AddSpotSheet';
import { LiveMap } from '@/components/irl/LiveMap';
import { WarmingUpStrip } from '@/components/irl/WarmingUpStrip';
import { useVisibilityStore } from '@/store/visibility';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import {
  configureHangoutMonitoring,
  getHangoutMonitoringStatus,
  refreshHangoutMonitoring,
  takePendingHangoutSuggestion,
} from '@/lib/hangout-geofencing';
import type { HangoutSpot, NearbyParent, Venue, VisibilityMode } from '@/types';

const MODE_COPY: Record<VisibilityMode, { title: string; body: string }> = {
  on: { title: 'On', body: 'Share as soon as you arrive at a hangout.' },
  auto: { title: 'Auto', body: 'Warn me, wait 5 minutes, then share.' },
  disabled: { title: 'Disabled', body: 'Never share my presence.' },
};

export default function IrlScreen() {
  const mode = useVisibilityStore((state) => state.mode);
  const visible = useVisibilityStore((state) => state.visible);
  const setMode = useVisibilityStore((state) => state.setMode);
  const myId = useCurrentParentId();
  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<NearbyParent[]>([]);
  const [warmingUp, setWarmingUp] = useState<{ venue: Venue; count: number }[]>([]);
  const [spots, setSpots] = useState<HangoutSpot[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addSpotOpen, setAddSpotOpen] = useState(false);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [near, warm, hangouts, active] = await Promise.all([
        data.getNearbyParents(),
        data.getWarmingUpVenues(),
        data.getHangoutSpots(),
        getHangoutMonitoringStatus(),
      ]);
      setPins(near);
      setWarmingUp(warm);
      setSpots(hangouts);
      setMonitoring(active);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh IRL right now.');
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  useFocusEffect(useCallback(() => {
    let active = true;
    takePendingHangoutSuggestion().then((suggestion) => {
      if (!active || !suggestion) return;
      const byline = suggestion.suggestedBy.length > 0
        ? `\n\n${suggestion.suggestedBy.join(' and ')} already use it.`
        : '';
      Alert.alert(
        'Make this a hangout spot?',
        `${suggestion.name} can become one of your Auto places.${byline}`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Add hangout',
            onPress: () => {
              data.setHangoutSpot(suggestion.venueId, true)
                .then(() => load(false))
                .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not add this hangout.'));
            },
          },
        ],
      );
    }).catch(() => {});
    return () => { active = false; };
  }, [load]));

  const visibleConnections = useMemo(
    () => pins.filter((pin) => pin.parent.id !== myId).map((pin) => pin.parent),
    [pins, myId],
  );
  const ownSpots = spots.filter((spot) => spot.is_mine);
  const suggestedSpots = spots.filter((spot) => !spot.is_mine && spot.suggested_by.length > 0);
  const mapVenues = useMemo(() => {
    const byId = new Map<string, Venue>();
    for (const item of warmingUp) byId.set(item.venue.id, item.venue);
    for (const spot of spots) byId.set(spot.venue.id, spot.venue);
    return [...byId.values()];
  }, [spots, warmingUp]);

  const updateMode = async (next: VisibilityMode) => {
    try {
      await setMode(next);
      setError(null);
      load(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update sharing.');
    }
  };

  const enableAuto = async () => {
    setSetupBusy(true);
    try {
      await configureHangoutMonitoring(spots);
      setMonitoring(true);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not enable Auto sharing.');
    } finally {
      setSetupBusy(false);
    }
  };

  const addSuggested = async (venue: Venue) => {
    try {
      await data.setHangoutSpot(venue.id, true);
      const next = await data.getHangoutSpots();
      setSpots(next);
      await refreshHangoutMonitoring(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this hangout.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow="YOUR VILLAGE, RIGHT NOW"
        title="IRL"
        flourish="sparkle"
        right={
          <VisibilityChip
            visible={visible}
            mode={mode}
            visibleParents={visibleConnections.slice(0, 3).map((parent) => ({
              initials: '',
              tone: parent.avatar_color as AvatarTone,
              imageUrl: parent.avatar_url,
            }))}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 130 }}
      >
        <SharingModeCard mode={mode} onChange={updateMode} />

        {mode === 'auto' && !monitoring ? (
          <Pressable
            onPress={enableAuto}
            disabled={setupBusy}
            style={{
              marginHorizontal: 14,
              marginBottom: 12,
              padding: 15,
              borderRadius: radii.lg,
              backgroundColor: colors.sageSoft,
              borderWidth: 1,
              borderColor: colors.sage,
            }}
          >
            <Text style={{ fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>
              {setupBusy ? 'opening permissions…' : 'Finish setting up Auto →'}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid, paddingTop: 4 }}>
              Allow “Always” location and notifications. We only share at your hangout spots, after the five-minute warning.
            </Text>
          </Pressable>
        ) : null}

        {error ? (
          <Text selectable style={{ paddingHorizontal: 18, paddingBottom: 10, fontFamily: fonts.sansSemi, fontSize: 12, color: colors.terracotta }}>
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ marginHorizontal: 14, height: 330 }}>
            <Skeleton width="100%" height="100%" radius={24} />
          </View>
        ) : (
          <View style={{ height: 330 }}>
            <LiveMap pins={pins} venues={mapVenues} meId={myId ?? ''} />
            <Pressable
              onPress={() => setAddSpotOpen(true)}
              style={{
                position: 'absolute',
                right: 26,
                bottom: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.rule,
                borderRadius: radii.pill,
                paddingHorizontal: 13,
                paddingVertical: 9,
                boxShadow: '0 4px 12px rgba(45,36,27,0.12)',
              }}
            >
              <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.dark }}>
                + new hangout
              </Text>
            </Pressable>
          </View>
        )}

        <WarmingUpStrip
          title="your hangout spots"
          items={ownSpots.map((spot) => ({
            venue: spot.venue,
            count: warmingUp.find((item) => item.venue.id === spot.venue.id)?.count ?? 0,
          }))}
        />
        {suggestedSpots.length > 0 ? (
          <WarmingUpStrip
            title="friends’ favorites"
            items={suggestedSpots.map((spot) => ({
              venue: spot.venue,
              count: warmingUp.find((item) => item.venue.id === spot.venue.id)?.count ?? 0,
            }))}
            onPressVenue={addSuggested}
          />
        ) : null}
      </ScrollView>

      <AddSpotSheet
        open={addSpotOpen}
        onClose={() => setAddSpotOpen(false)}
        onCreated={async () => {
          setAddSpotOpen(false);
          const next = await data.getHangoutSpots();
          setSpots(next);
          await refreshHangoutMonitoring(next);
          load(false);
        }}
      />
    </SafeAreaView>
  );
}

function SharingModeCard({ mode, onChange }: { mode: VisibilityMode; onChange: (mode: VisibilityMode) => void }) {
  return (
    <View style={{ marginHorizontal: 14, marginBottom: 12, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}>
      <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6, color: colors.brownMid }}>
        OUT & ABOUT
      </Text>
      <View style={{ flexDirection: 'row', gap: 7, paddingTop: 10 }}>
        {(Object.keys(MODE_COPY) as VisibilityMode[]).map((item) => {
          const selected = item === mode;
          return (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: radii.md, alignItems: 'center', backgroundColor: selected ? colors.terracotta : colors.cream, borderWidth: 1, borderColor: selected ? colors.terracotta : colors.rule }}
            >
              <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: selected ? colors.white : colors.dark }}>
                {MODE_COPY[item].title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.brownMid, paddingTop: 9 }}>
        {MODE_COPY[mode].body}
      </Text>
    </View>
  );
}
