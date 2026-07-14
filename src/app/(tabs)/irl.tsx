import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { EmptyState, ScreenHeader, Skeleton, VisibilityChip } from '@/components/ui';
import { AddSpotSheet } from '@/components/irl/AddSpotSheet';
import { IllustratedMap } from '@/components/irl/IllustratedMap';
import { WarmingUpStrip } from '@/components/irl/WarmingUpStrip';
import { useVisibilityStore } from '@/store/visibility';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import type { NearbyParent, Venue } from '@/types';

export default function IrlScreen() {
  const visible = useVisibilityStore((s) => s.visible);
  const toggle = useVisibilityStore((s) => s.toggle);
  const myId = useCurrentParentId();

  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<NearbyParent[]>([]);
  const [warmingUp, setWarmingUp] = useState<{ venue: Venue; count: number }[]>([]);
  const [addSpotOpen, setAddSpotOpen] = useState(false);

  const load = useCallback(async (initial: boolean = false) => {
    if (initial) setLoading(true);
    try {
      const [near, warm] = await Promise.all([
        data.getNearbyParents(),
        data.getWarmingUpVenues(),
      ]);
      setPins(near);
      setWarmingUp(warm);
    } catch (e) {
      console.warn('irl load failed', e);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load, visible]);

  const mapPins = pins.filter((p) => visible || p.parent.id !== myId);
  // The header chip avatars come straight from the pins we already
  // fetched — no separate parent_locations query needed on this tab.
  const visibleConnections = useMemo(
    () => pins.filter((p) => p.parent.id !== myId).map((p) => p.parent),
    [pins, myId],
  );

  const checkIn = useCallback(
    async (venue: Venue) => {
      try {
        await data.checkInAtVenue(venue.id);
        useVisibilityStore.setState({ visible: true });
        load(false);
      } catch (e) {
        console.warn('check-in failed', e);
      }
    },
    [load],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow="YOUR VILLAGE, RIGHT NOW"
        title="IRL"
        flourish="sparkle"
        right={
          <VisibilityChip
            visible={visible}
            visibleParents={
              visible
                ? visibleConnections.slice(0, 3).map((p) => ({
                    initials: '',
                    tone: p.avatar_color as AvatarTone,
                  }))
                : []
            }
            onPress={toggle}
          />
        }
      />

      <View style={{ height: 18 }} />

      {loading ? (
        <View style={{ marginHorizontal: 14, flex: 1 }}>
          <Skeleton width="100%" height="100%" radius={24} />
        </View>
      ) : mapPins.length === 0 ? (
        // Truly empty only when even the user isn't on the map — if
        // they're out & about, their own pin renders below instead.
        <EmptyState
          eyebrow="QUIET VILLAGE"
          title="no one's out & about right now"
          body="check in at a spot below, or pin a new one — your connections will see you on this map."
          flourish="sparkle"
        />
      ) : (
        <View style={{ flex: 1 }}>
          <IllustratedMap pins={mapPins} meId={myId ?? ''} />
          <Pressable
            onPress={() => setAddSpotOpen(true)}
            style={{
              position: 'absolute',
              right: 26,
              bottom: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.rule,
              borderRadius: 18,
              paddingHorizontal: 13,
              paddingVertical: 8,
              shadowColor: '#2D241B',
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.dark }}>
              + add a spot
            </Text>
          </Pressable>
        </View>
      )}

      <WarmingUpStrip items={warmingUp} onPressVenue={checkIn} />

      <View style={{ height: 116 }} />

      <AddSpotSheet
        open={addSpotOpen}
        onClose={() => setAddSpotOpen(false)}
        onCreated={() => {
          setAddSpotOpen(false);
          useVisibilityStore.setState({ visible: true });
          load(false);
        }}
      />
    </SafeAreaView>
  );
}
