import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import {
  ActivityCardSkeleton,
  EmptyState,
  Icon,
  ScreenHeader,
  TwinkleSparkle,
} from '@/components/ui';
import { ActivityCard } from '@/components/plans/ActivityCard';
import { DiscoveredActivityCard } from '@/components/plans/DiscoveredActivityCard';
import type { ActivitySocialProof } from '@/types';

type Row =
  | { kind: 'section'; key: string; label: string }
  | { kind: 'activity'; key: string; proof: ActivitySocialProof; rotation: number }
  | { kind: 'discovered'; key: string; proof: ActivitySocialProof };

// Only the first two cards get a noticeable tilt — keeps the scrapbook
// feel without a wall of chaotic rotations on a long Plans list.
const ROTATIONS = [-2, 1.6, 0, 0, 0];

export default function PlansScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcoming, setUpcoming] = useState<ActivitySocialProof[]>([]);
  const [discovered, setDiscovered] = useState<ActivitySocialProof[]>([]);

  const load = useCallback(async (initial: boolean = false) => {
    if (initial) setLoading(true);
    const [u, d] = await Promise.all([
      data.getUpcomingActivities(),
      data.getDiscoveredActivityPreviews(),
    ]);
    setUpcoming(u);
    setDiscovered(d);
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const rows: Row[] = [
    ...upcoming.map((proof, i) => ({
      kind: 'activity' as const,
      key: `activity-${proof.activity.id}`,
      proof,
      rotation: ROTATIONS[i] ?? 0,
    })),
    ...(discovered.length > 0
      ? [{ kind: 'section' as const, key: 'discovered-section', label: 'Discovered for you' }]
      : []),
    ...discovered.map((proof) => ({
      kind: 'discovered' as const,
      key: `discovered-${proof.activity.id}`,
      proof,
    })),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow="THIS WEEK & NEXT"
        title="plans"
        flourish="squiggle"
        right={
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.rule,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="search" size={19} color={colors.dark} weight={1.8} />
          </View>
        }
      />

      {loading ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          eyebrow="NOTHING ON DECK"
          title="no plans this week"
          body="check back soon — admins post weekly favorites, and discoveries roll in from your friend group."
          flourish="squiggle"
        />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item }) => {
            if (item.kind === 'section') {
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 6,
                    marginBottom: 12,
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 22,
                      color: colors.dark,
                      letterSpacing: -0.3,
                    }}
                  >
                    {item.label}
                  </Text>
                  <TwinkleSparkle size={14} color={colors.amberLight} />
                </View>
              );
            }
            if (item.kind === 'discovered') {
              return (
                <DiscoveredActivityCard
                  proof={item.proof}
                  onConfirm={async () => {
                    await data.updateActivityInteraction(item.proof.activity.id, 'interested');
                    load(false);
                  }}
                  onSkip={() => load(false)}
                />
              );
            }
            return (
              <ActivityCard
                proof={item.proof}
                rotation={item.rotation}
                onStateChanged={() => load(false)}
              />
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 18,
            paddingBottom: 140,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.terracotta}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
