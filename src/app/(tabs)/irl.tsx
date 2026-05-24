import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { EmptyState, ScreenHeader, Skeleton, VisibilityChip } from '@/components/ui';
import { IllustratedMap } from '@/components/irl/IllustratedMap';
import { WarmingUpStrip } from '@/components/irl/WarmingUpStrip';
import { useVisibilityStore } from '@/store/visibility';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import type { NearbyParent, Parent, Venue } from '@/types';

export default function IrlScreen() {
  const visible = useVisibilityStore((s) => s.visible);
  const toggle = useVisibilityStore((s) => s.toggle);
  const myId = useCurrentParentId();

  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<NearbyParent[]>([]);
  const [warmingUp, setWarmingUp] = useState<{ venue: Venue; count: number }[]>([]);
  const [visibleConnections, setVisibleConnections] = useState<Parent[]>([]);

  const load = useCallback(async (initial: boolean = false) => {
    if (initial) setLoading(true);
    const [near, warm, conns] = await Promise.all([
      data.getNearbyParents(),
      data.getWarmingUpVenues(),
      data.getVisibleConnectionAvatars(),
    ]);
    setPins(near);
    setWarmingUp(warm);
    setVisibleConnections(conns);
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load, visible]);

  const mapPins = pins.filter((p) => visible || p.parent.id !== myId);
  const otherPins = mapPins.filter((p) => p.parent.id !== myId);

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
      ) : otherPins.length === 0 ? (
        <EmptyState
          eyebrow="QUIET VILLAGE"
          title="no one's out & about right now"
          body="when your connected parents check in at a park, studio, or playground, they'll appear on this map."
          flourish="sparkle"
        />
      ) : (
        <IllustratedMap pins={mapPins} meId={myId ?? ''} />
      )}

      <WarmingUpStrip items={warmingUp} />

      <View style={{ height: 116 }} />
    </SafeAreaView>
  );
}
