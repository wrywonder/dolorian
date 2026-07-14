import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
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
import type { ActivitySocialProof, VenueType } from '@/types';

type Row =
  | { kind: 'section'; key: string; label: string }
  | { kind: 'activity'; key: string; proof: ActivitySocialProof; rotation: number }
  | { kind: 'discovered'; key: string; proof: ActivitySocialProof };

// Only the first two cards get a noticeable tilt — keeps the scrapbook
// feel without a wall of chaotic rotations on a long Plans list.
const ROTATIONS = [-2, 1.6, 0, 0, 0];
type DateFilter = 'all' | 'week' | 'weekend';
type CategoryFilter = 'all' | VenueType;

export default function PlansScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcoming, setUpcoming] = useState<ActivitySocialProof[]>([]);
  const [discovered, setDiscovered] = useState<ActivitySocialProof[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [friendsOnly, setFriendsOnly] = useState(false);

  const load = useCallback(async (initial: boolean = false) => {
    if (initial) setLoading(true);
    try {
      const [u, d] = await Promise.all([
        data.getUpcomingActivities(),
        data.getDiscoveredActivityPreviews(),
      ]);
      setUpcoming(u);
      setDiscovered(d);
    } catch (e) {
      console.warn('plans load failed', e);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const categories = useMemo<CategoryFilter[]>(() => {
    const values = new Set<VenueType>();
    for (const proof of [...upcoming, ...discovered]) {
      if (proof.venue) values.add(proof.venue.venue_type);
    }
    return ['all', ...values];
  }, [upcoming, discovered]);

  const filterProofs = useCallback((proofs: ActivitySocialProof[]) => {
    const needle = query.trim().toLowerCase();
    return proofs.filter((proof) => {
      const { activity, venue } = proof;
      const searchable = [
        activity.name,
        activity.description,
        venue?.name,
        venue?.venue_type,
      ].filter(Boolean).join(' ').toLowerCase();
      if (needle && !searchable.includes(needle)) return false;
      if (categoryFilter !== 'all' && venue?.venue_type !== categoryFilter) return false;
      if (!matchesDate(activity.starts_at, dateFilter)) return false;
      if (
        friendsOnly
        && proof.interestedConnections.length === 0
        && proof.goingConnections.length === 0
      ) return false;
      return true;
    });
  }, [categoryFilter, dateFilter, friendsOnly, query]);

  const filteredUpcoming = useMemo(() => filterProofs(upcoming), [filterProofs, upcoming]);
  const filteredDiscovered = useMemo(() => filterProofs(discovered), [discovered, filterProofs]);

  const rows: Row[] = useMemo(
    () => [
      ...filteredUpcoming.map((proof, i) => ({
        kind: 'activity' as const,
        key: `activity-${proof.activity.id}`,
        proof,
        rotation: ROTATIONS[i] ?? 0,
      })),
      ...(filteredDiscovered.length > 0
        ? [{ kind: 'section' as const, key: 'discovered-section', label: 'Discovered for you' }]
        : []),
      ...filteredDiscovered.map((proof) => ({
        kind: 'discovered' as const,
        key: `discovered-${proof.activity.id}`,
        proof,
      })),
    ],
    [filteredUpcoming, filteredDiscovered],
  );

  const hasActiveFilters = Boolean(
    query.trim()
    || dateFilter !== 'all'
    || categoryFilter !== 'all'
    || friendsOnly,
  );

  const clearFilters = () => {
    setQuery('');
    setDateFilter('all');
    setCategoryFilter('all');
    setFriendsOnly(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow="THIS WEEK & NEXT"
        title="plans"
        flourish="squiggle"
        right={
          <Pressable
            onPress={() => setFiltersOpen((open) => !open)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: hasActiveFilters ? colors.terracotta : colors.surface,
              borderWidth: 1,
              borderColor: colors.rule,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={filtersOpen ? 'x' : 'search'} size={19} color={hasActiveFilters ? colors.white : colors.dark} weight={1.8} />
          </Pressable>
        }
      />

      {filtersOpen ? (
        <View
          style={{
            marginHorizontal: 14,
            marginTop: 10,
            padding: 12,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.rule,
          }}
        >
          <View
            style={{
              height: 42,
              borderRadius: 14,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.cream,
            }}
          >
            <Icon name="search" size={16} color={colors.taupe} weight={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="search plans or places"
              placeholderTextColor={colors.taupe}
              returnKeyType="search"
              style={{ flex: 1, fontFamily: fonts.sansSemi, fontSize: 13, color: colors.dark }}
            />
          </View>

          <Text style={{ fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.6, color: colors.taupe, marginTop: 12, marginBottom: 7 }}>
            WHEN
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            <FilterChip label="anytime" selected={dateFilter === 'all'} onPress={() => setDateFilter('all')} />
            <FilterChip label="next 7 days" selected={dateFilter === 'week'} onPress={() => setDateFilter('week')} />
            <FilterChip label="this weekend" selected={dateFilter === 'weekend'} onPress={() => setDateFilter('weekend')} />
            <FilterChip label="friends are in" selected={friendsOnly} onPress={() => setFriendsOnly((value) => !value)} />
          </ScrollView>

          {categories.length > 1 ? (
            <>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.6, color: colors.taupe, marginTop: 12, marginBottom: 7 }}>
                CATEGORY
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    label={category === 'all' ? 'all places' : category}
                    selected={categoryFilter === category}
                    onPress={() => setCategoryFilter(category)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {hasActiveFilters ? (
            <Pressable onPress={clearFilters} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 11, color: colors.terracotta }}>
                clear filters
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          eyebrow={hasActiveFilters ? 'NO MATCHES' : 'NOTHING ON DECK'}
          title={hasActiveFilters ? 'nothing fits those filters' : 'no plans this week'}
          body={hasActiveFilters
            ? 'try another date, place, or search — your full plans list is still here.'
            : 'check back soon — admins post weekly favorites, and discoveries roll in from your friend group.'}
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

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 14,
        backgroundColor: selected ? colors.dark : colors.cream,
        borderWidth: 1,
        borderColor: selected ? colors.dark : colors.rule,
      }}
    >
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 11, color: selected ? colors.white : colors.brownMid }}>
        {label}
      </Text>
    </Pressable>
  );
}

function matchesDate(startsAt: string | null, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  if (!startsAt) return false;
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) return false;
  const now = new Date();
  if (filter === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return starts >= now && starts <= end;
  }

  const weekendStart = new Date(now);
  weekendStart.setHours(0, 0, 0, 0);
  const day = weekendStart.getDay();
  const daysToSaturday = day === 0 ? -1 : (6 - day + 7) % 7;
  weekendStart.setDate(weekendStart.getDate() + daysToSaturday);
  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendEnd.getDate() + 1);
  weekendEnd.setHours(23, 59, 59, 999);
  return starts >= weekendStart && starts <= weekendEnd;
}
