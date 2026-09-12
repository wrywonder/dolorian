import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ActivityCard } from '@/components/plans/ActivityCard';
import { ActivityCardSkeleton, EmptyState, Icon, ScreenHeader, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import { planDateKeys, planIsRecent, planIsUpcoming, planOccursOnDay } from '@/lib/plan-dates';
import { createLatestRequest } from '@/lib/latest-request';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { ActivitySocialProof, PlanVisibility, UUID } from '@/types';

type ViewMode = 'list' | 'calendar';
type TimeRange = 'upcoming' | 'recent';
type AudienceFilter = 'all' | PlanVisibility | 'mine';
type ParticipationFilter = 'all' | 'joining';
type SortMode = 'soonest' | 'popular' | 'newest';

const AUDIENCE_FILTERS: { value: AudienceFilter; label: string }[] = [
  { value: 'all', label: 'all plans' },
  { value: 'public', label: 'public' },
  { value: 'connections', label: 'my village' },
  { value: 'invited', label: 'invited' },
  { value: 'mine', label: 'created by me' },
];

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'soonest', label: 'date' },
  { value: 'popular', label: 'most people' },
  { value: 'newest', label: 'newest' },
];

export default function PlansScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<ActivitySocialProof[]>([]);
  const [myId, setMyId] = useState<UUID | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [timeRange, setTimeRange] = useState<TimeRange>('upcoming');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [sort, setSort] = useState<SortMode>('soonest');
  const [participation, setParticipation] = useState<ParticipationFilter>('all');
  const [requests] = useState(createLatestRequest);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const load = useCallback(async () => {
    const isCurrent = requests.begin();
    setError(null);
    try {
      const [visiblePlans, me] = await Promise.all([data.getUpcomingActivities(), data.getCurrentUser()]);
      if (!isCurrent()) return;
      setPlans(visiblePlans);
      setMyId(me.id);
    } catch (cause) {
      if (isCurrent()) setError(readableError(cause, 'Could not load your plans. Try again when you’re connected.'));
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  }, [requests]);

  useRefreshOnFocus(load, requests.invalidate);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = new Date();

    const matching = plans.filter((proof) => {
      const { activity, venue } = proof;
      if (timeRange === 'upcoming' && !planIsUpcoming(activity, now)) return false;
      if (timeRange === 'recent' && !planIsRecent(activity, now)) return false;
      if (participation === 'joining' && !['going', 'interested', 'attended'].includes(proof.myState ?? '')) return false;
      if (audience === 'mine') {
        if (!myId || activity.created_by !== myId) return false;
      } else if (audience !== 'all' && activity.visibility !== audience) {
        return false;
      }
      if (needle) {
        const searchable = [
          activity.name,
          activity.description,
          activity.location_name,
          activity.location_address,
          venue?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(needle)) return false;
      }
      return true;
    });

    return matching.sort((left, right) => {
      if (sort === 'popular') return participantCount(right) - participantCount(left);
      if (sort === 'newest') return Date.parse(right.activity.created_at) - Date.parse(left.activity.created_at);
      const leftTime = left.activity.starts_at ? Date.parse(left.activity.starts_at) : Number.MAX_SAFE_INTEGER;
      const rightTime = right.activity.starts_at ? Date.parse(right.activity.starts_at) : Number.MAX_SAFE_INTEGER;
      return timeRange === 'recent' ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [audience, myId, participation, plans, query, sort, timeRange]);

  const selectedPlans = useMemo(
    () => filtered.filter((proof) => planOccursOnDay(proof.activity, selectedDay)),
    [filtered, selectedDay],
  );

  const hasFilters = Boolean(query.trim() || audience !== 'all' || participation !== 'all' || sort !== 'soonest');
  const resetFilters = () => { setQuery(''); setAudience('all'); setParticipation('all'); setSort('soonest'); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow="WHAT’S HAPPENING"
        title="plans"
        flourish="squiggle"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Add a plan" onPress={() => router.push('/plan/new' as never)} style={styles.addButton}>
            <Icon name="plus" size={21} color={colors.white} />
          </Pressable>
        }
      />

      <View style={styles.toolbar}>
        <SegmentedControl
          options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]}
          value={viewMode}
          onChange={(value) => setViewMode(value as ViewMode)}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Find and sort plans" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen((open) => !open)} style={[styles.filterButton, filtersOpen && styles.filterButtonActive]}>
          <Icon name={filtersOpen ? 'x' : 'search'} size={17} color={filtersOpen ? colors.white : colors.dark} />
          <Text style={[styles.filterText, filtersOpen && { color: colors.white }]}>{hasFilters ? 'filters on' : 'find & sort'}</Text>
        </Pressable>
      </View>

      <View style={styles.timeTabs}>
        <TimeTab label="Upcoming" selected={timeRange === 'upcoming'} onPress={() => setTimeRange('upcoming')} />
        <TimeTab label="Recent" selected={timeRange === 'recent'} onPress={() => setTimeRange('recent')} />
      </View>

      {hasFilters && !filtersOpen ? (
        <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.resetFilters}>
          <Text style={styles.clearText}>clear filters · show all plans</Text>
        </Pressable>
      ) : null}

      {filtersOpen ? (
        <View style={styles.filters}>
          <View style={styles.searchField}>
            <Icon name="search" size={16} color={colors.taupe} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="search plans, places, or activities"
              placeholderTextColor={colors.taupe}
              returnKeyType="search"
              style={styles.searchInput}
            />
          </View>
          <FilterGroup label="MY PLANS">
            <FilterChip label="all plans" selected={participation === 'all'} onPress={() => setParticipation('all')} />
            <FilterChip label="going & interested" selected={participation === 'joining'} onPress={() => setParticipation('joining')} />
          </FilterGroup>
          <FilterGroup label="WHO CAN SEE IT">
            {AUDIENCE_FILTERS.map((filter) => (
              <FilterChip key={filter.value} label={filter.label} selected={audience === filter.value} onPress={() => setAudience(filter.value)} />
            ))}
          </FilterGroup>
          <FilterGroup label="SORT BY">
            {SORTS.map((option) => (
              <FilterChip key={option.value} label={option.label} selected={sort === option.value} onPress={() => setSort(option.value)} />
            ))}
          </FilterGroup>
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 18 }}><ActivityCardSkeleton /><ActivityCardSkeleton /></View>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          month={calendarMonth}
          selectedDay={selectedDay}
          plans={filtered}
          selectedPlans={selectedPlans}
          error={error}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPrevious={() => {
            const previous = subMonths(calendarMonth, 1);
            setCalendarMonth(previous);
            setSelectedDay(previous);
          }}
          onNext={() => {
            const next = addMonths(calendarMonth, 1);
            setCalendarMonth(next);
            setSelectedDay(next);
          }}
          onSelectDay={setSelectedDay}
          onOpen={(id) => router.push(`/plan/${id}` as never)}
          onReload={load}
        />
      ) : (
        <ListView
          plans={filtered}
          error={error}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onOpen={(id) => router.push(`/plan/${id}` as never)}
          onReload={load}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          timeRange={timeRange}
        />
      )}
    </SafeAreaView>
  );
}

function ListView({ plans, error, refreshing, onRefresh, onOpen, onReload, hasFilters, onResetFilters, timeRange }: {
  plans: ActivitySocialProof[];
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (id: UUID) => void;
  onReload: () => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  timeRange: TimeRange;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.terracotta} />}
    >
      {error ? <PlanLoadError error={error} onRetry={onReload} /> : null}
      {plans.length ? plans.map((proof, index) => (
        <ActivityCard
          key={proof.activity.id}
          proof={proof}
          rotation={index === 0 ? -0.8 : index === 1 ? 0.6 : 0}
          onOpen={() => onOpen(proof.activity.id)}
          onStateChanged={onReload}
        />
      )) : !error ? (
        <View>
        <EmptyState
          eyebrow={hasFilters ? 'NO MATCHES' : timeRange === 'recent' ? 'A QUIET FEW WEEKS' : 'NOTHING ON DECK'}
          title={hasFilters ? 'nothing fits that search' : timeRange === 'recent' ? 'no recent plans' : 'make the first plan'}
          body={hasFilters
            ? 'Try a broader search or choose all plans.'
            : timeRange === 'recent'
              ? 'Plans from the last 45 days will show up here.'
              : 'Add a camp, market day, playground meetup, or anything your family is considering.'}
          flourish="squiggle"
        />
        {hasFilters ? (
          <TerracottaButton label="clear filters" onPress={onResetFilters} style={{ alignSelf: 'center' }} />
        ) : timeRange === 'upcoming' ? (
          <TerracottaButton label="add a plan →" onPress={() => router.push('/plan/new' as never)} style={{ alignSelf: 'center' }} />
        ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function CalendarView({ month, selectedDay, plans, selectedPlans, error, refreshing, onRefresh, onPrevious, onNext, onSelectDay, onOpen, onReload }: {
  month: Date;
  selectedDay: Date;
  plans: ActivitySocialProof[];
  selectedPlans: ActivitySocialProof[];
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelectDay: (day: Date) => void;
  onReload: () => void;
  onOpen: (id: UUID) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  const countByDay = new Map<string, number>();
  plans.forEach((proof) => {
    planDateKeys(proof.activity).forEach((key) => {
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    });
  });

  return (
    <ScrollView
      contentContainerStyle={styles.calendarContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.terracotta} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityLabel="Previous month" onPress={onPrevious} style={styles.monthButton}>
            <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={17} color={colors.dark} /></View>
          </Pressable>
          <Text style={styles.monthTitle}>{format(month, 'MMMM yyyy')}</Text>
          <Pressable accessibilityLabel="Next month" onPress={onNext} style={styles.monthButton}>
            <Icon name="chevron.right" size={17} color={colors.dark} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
        </View>
        <View style={styles.dayGrid}>
          {days.map((day) => {
            const count = countByDay.get(format(day, 'yyyy-MM-dd')) ?? 0;
            const selected = isSameDay(day, selectedDay);
            const inMonth = isSameMonth(day, month);
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={`${format(day, 'EEEE, MMMM d')}, ${count} ${count === 1 ? 'plan' : 'plans'}`} accessibilityState={{ selected }} key={day.toISOString()} onPress={() => onSelectDay(day)} style={[styles.dayCell, selected && styles.daySelected]}>
                <Text style={[styles.dayNumber, !inMonth && { opacity: 0.3 }, selected && { color: colors.white }]}>{format(day, 'd')}</Text>
                <View style={styles.dots}>{Array.from({ length: Math.min(count, 3) }).map((_, index) => <View key={index} style={[styles.dot, selected && { backgroundColor: colors.white }]} />)}</View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.dayHeading}>
        <View><Text style={styles.eyebrow}>SELECTED DAY</Text><Text style={styles.dayTitle}>{format(selectedDay, 'EEEE, MMMM d')}</Text></View>
        <Text style={styles.dayCount}>{selectedPlans.length}</Text>
      </View>
      {error ? <PlanLoadError error={error} onRetry={onReload} /> : null}
      {selectedPlans.length ? selectedPlans.map((proof) => (
        <CompactPlan key={proof.activity.id} proof={proof} onPress={() => onOpen(proof.activity.id)} />
      )) : !error ? <Text style={styles.noDayPlans}>No visible plans on this day.</Text> : null}
    </ScrollView>
  );
}

function CompactPlan({ proof, onPress }: { proof: ActivitySocialProof; onPress: () => void }) {
  const { activity, venue } = proof;
  return (
    <Pressable onPress={onPress} style={styles.compactPlan}>
      <View style={styles.compactTime}>
        <Text style={styles.compactTimeText}>{activity.all_day ? 'ALL\nDAY' : activity.starts_at ? format(new Date(activity.starts_at), 'h:mm\na') : 'TBD'}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.compactTitle}>{activity.emoji ? `${activity.emoji} ` : ''}{activity.name}</Text>
        {activity.cancelled_at ? <Text style={styles.cancelledLabel}>CANCELLED</Text> : null}
        <Text style={styles.compactMeta}>{activity.location_name ?? venue?.name ?? visibilityLabel(activity.visibility)} · {participantCount(proof)} responding</Text>
      </View>
      <Icon name="chevron.right" size={17} color={colors.taupe} />
    </Pressable>
  );
}

function PlanLoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <View style={styles.loadError}>
    <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text>
    <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.clearText}>try again →</Text></Pressable>
  </View>;
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.eyebrow}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{children}</ScrollView>
    </View>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function TimeTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.timeTab, selected && styles.timeTabSelected]}>
      <Text style={[styles.timeTabText, selected && { color: colors.terracotta }]}>{label}</Text>
    </Pressable>
  );
}

function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: option.value === value }} key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, option.value === value && styles.segmentSelected]}>
          {option.value === 'calendar' ? <Icon name="calendar" size={14} color={option.value === value ? colors.white : colors.taupe} /> : null}
          <Text style={[styles.segmentText, option.value === value && { color: colors.white }]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function participantCount(proof: ActivitySocialProof): number {
  return proof.goingConnections.length + proof.interestedConnections.length + proof.outConnections.length + (proof.myState ? 1 : 0);
}

function visibilityLabel(visibility: PlanVisibility): string {
  if (visibility === 'connections') return 'My village';
  if (visibility === 'invited') return 'Invited only';
  return 'Public';
}

const styles = {
  resetFilters: { minHeight: 40, marginHorizontal: 14, justifyContent: 'center', alignItems: 'flex-end' } as const,
  clearText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta } as const,
  loadError: { marginBottom: 14, padding: 14, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.surface } as const,
  retryButton: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' } as const,
  cancelledLabel: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.terracotta } as const,
  addButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.terracotta, alignItems: 'center', justifyContent: 'center', shadowColor: '#924328', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 2 }, shadowRadius: 0, elevation: 3 } as const,
  toolbar: { paddingHorizontal: 14, paddingTop: 8, flexDirection: 'row', gap: 9, alignItems: 'center' } as const,
  segmented: { flex: 1, flexDirection: 'row', padding: 3, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  segment: { flex: 1, minHeight: 36, borderRadius: 12, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' } as const,
  segmentSelected: { backgroundColor: colors.dark } as const,
  segmentText: { fontFamily: fonts.sansExtra, fontSize: 11, color: colors.taupe } as const,
  filterButton: { minHeight: 42, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, flexDirection: 'row', gap: 6, alignItems: 'center' } as const,
  filterButtonActive: { backgroundColor: colors.terracotta, borderColor: colors.terracotta } as const,
  filterText: { fontFamily: fonts.sansExtra, fontSize: 11, color: colors.dark } as const,
  timeTabs: { marginHorizontal: 14, marginTop: 10, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  timeTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' } as const,
  timeTabSelected: { borderBottomColor: colors.terracotta } as const,
  timeTabText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.taupe } as const,
  filters: { marginHorizontal: 14, marginTop: 10, padding: 12, gap: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  searchField: { height: 42, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cream } as const,
  searchInput: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 13, color: colors.dark } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.7, color: colors.taupe } as const,
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.rule } as const,
  chipSelected: { backgroundColor: colors.dark, borderColor: colors.dark } as const,
  chipText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.brownMid } as const,
  listContent: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 140 } as const,
  error: { marginBottom: 14, fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
  calendarContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 140 } as const,
  calendarCard: { padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } as const,
  monthButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' } as const,
  monthTitle: { fontFamily: fonts.serifRegular, fontSize: 22, color: colors.dark } as const,
  weekRow: { flexDirection: 'row', marginBottom: 4 } as const,
  weekday: { width: '14.2857%', textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 9, color: colors.taupe } as const,
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' } as const,
  dayCell: { width: '14.2857%', aspectRatio: 0.9, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 4 } as const,
  daySelected: { backgroundColor: colors.terracotta } as const,
  dayNumber: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.dark } as const,
  dots: { height: 4, flexDirection: 'row', gap: 2 } as const,
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.terracotta } as const,
  dayHeading: { marginTop: 20, marginBottom: 10, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as const,
  dayTitle: { marginTop: 3, fontFamily: fonts.serifRegular, fontSize: 23, color: colors.dark } as const,
  dayCount: { minWidth: 30, height: 30, borderRadius: 15, textAlign: 'center', lineHeight: 30, fontFamily: fonts.sansExtra, fontSize: 12, color: colors.white, backgroundColor: colors.dark } as const,
  noDayPlans: { padding: 20, borderRadius: radii.lg, textAlign: 'center', fontFamily: fonts.sans, fontSize: 12, color: colors.taupe, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  compactPlan: { minHeight: 74, marginBottom: 9, padding: 11, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  compactTime: { width: 45, minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E6' } as const,
  compactTimeText: { textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 12, color: colors.terracotta, textTransform: 'uppercase' } as const,
  compactTitle: { fontFamily: fonts.serifRegular, fontSize: 18, lineHeight: 21, color: colors.dark } as const,
  compactMeta: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.taupe } as const,
};
