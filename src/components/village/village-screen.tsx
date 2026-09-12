import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FormScrollView as ScrollView } from '@/components/ui/FormScrollView';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarCircle, Icon } from '@/components/ui';
import { colors, fonts, radii, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type {
  BlockedParent,
  ConnectionInvite,
  ConnectionNotificationPreferences,
  ConnectionView,
  SuggestedConnection,
  UUID,
} from '@/types';

type VillageTab = 'friends' | 'requests' | 'invites' | 'blocked';
type SortMode = 'favorites' | 'name' | 'recent';

const TAB_OPTIONS: { key: VillageTab; label: string }[] = [
  { key: 'friends', label: 'Connections' },
  { key: 'requests', label: 'Requests' },
  { key: 'invites', label: 'Invites' },
  { key: 'blocked', label: 'Blocked' },
];

const DEFAULT_NOTIFICATIONS: ConnectionNotificationPreferences = {
  parent_id: '',
  connection_requests: true,
  connection_acceptances: true,
  invite_redemptions: true,
  plan_invitations: true,
  updated_at: new Date(0).toISOString(),
};

export function VillageScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const requestedTab = TAB_OPTIONS.some((item) => item.key === params.tab)
    ? params.tab as VillageTab
    : 'friends';
  const [tab, setTab] = useState<VillageTab>(requestedTab);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [invites, setInvites] = useState<ConnectionInvite[]>([]);
  const [blocked, setBlocked] = useState<BlockedParent[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [outIds, setOutIds] = useState<Set<UUID>>(new Set());
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('favorites');
  const [outOnly, setOutOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [nextConnections, nextInvites, nextBlocked, nextSuggestions, nearby, nextNotifications] = await Promise.all([
        data.getConnectionViews(),
        data.getConnectionInvites(),
        data.getBlockedParents(),
        data.getSuggestedConnections(),
        data.getNearbyParents(),
        data.getConnectionNotificationPreferences(),
      ]);
      setConnections(nextConnections);
      setInvites(nextInvites);
      setBlocked(nextBlocked);
      setSuggestions(nextSuggestions);
      setOutIds(new Set(nearby.map((item) => item.parent.id)));
      setNotifications(nextNotifications);
      setError(null);
    } catch (cause) {
      console.warn('village load failed', cause);
      setError(readableError(cause, 'Could not load your village.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const connected = connections.filter((item) => item.connection.status === 'connected');
  const incoming = connections.filter((item) => item.incoming);
  const outgoing = connections.filter((item) => item.outgoing);
  const activeInvites = invites.filter((invite) => !invite.revoked_at && new Date(invite.expires_at) > new Date() && invite.use_count < invite.max_uses);

  const visibleConnections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = connected.filter((item) => {
      if (outOnly && !outIds.has(item.parent.id)) return false;
      if (!normalized) return true;
      return item.parent.display_name.toLowerCase().includes(normalized)
        || item.parent.neighborhood?.toLowerCase().includes(normalized)
        || item.preference.note?.toLowerCase().includes(normalized);
    });
    return filtered.sort((a, b) => {
      if (sortMode === 'name') return a.parent.display_name.localeCompare(b.parent.display_name);
      if (sortMode === 'recent') return b.connection.created_at.localeCompare(a.connection.created_at);
      if (a.preference.favorite !== b.preference.favorite) return a.preference.favorite ? -1 : 1;
      return a.parent.display_name.localeCompare(b.parent.display_name);
    });
  }, [connected, outIds, outOnly, query, sortMode]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusyId(key);
    setError(null);
    try {
      await action();
      await load();
    } catch (cause) {
      setError(readableError(cause, 'That did not work. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleFavorite = (item: ConnectionView) => run(`favorite-${item.parent.id}`, () =>
    data.setConnectionPreferences(item.parent.id, {
      ...item.preference,
      favorite: !item.preference.favorite,
    }));

  const updateNotification = async (
    key: 'connection_requests' | 'connection_acceptances' | 'invite_redemptions' | 'plan_invitations',
    value: boolean,
  ) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    try {
      const saved = await data.updateConnectionNotificationPreferences(next);
      setNotifications(saved);
    } catch (cause) {
      setNotifications(notifications);
      setError(readableError(cause, 'Could not update notifications.'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <KeyboardFrame>
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.iconButton}
          >
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron.right" size={19} color={colors.dark} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>YOUR VILLAGE</Text>
            <Text style={{ fontFamily: fonts.serifRegular, fontSize: 28, color: colors.dark }}>people you count on</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Invite a parent"
            onPress={() => router.push('/add-to-village' as never)}
            style={[styles.iconButton, { backgroundColor: colors.terracotta }]}
          >
            <Icon name="person.2" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.rule }}>
          <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 7, paddingBottom: 11 }}>
            {TAB_OPTIONS.map((option) => {
              const selected = tab === option.key;
              const count = option.key === 'requests' ? incoming.length + outgoing.length
                : option.key === 'blocked' ? blocked.length
                  : option.key === 'invites' ? activeInvites.length : 0;
              return (
                <Pressable key={option.key} onPress={() => setTab(option.key)} style={[styles.tab, selected && styles.tabSelected]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={[styles.tabText, selected && { color: colors.white }]}>{option.label}</Text>
                    {count ? (
                      <View style={[styles.tabCount, selected && styles.tabCountSelected]}>
                        <Text style={[styles.tabCountText, selected && { color: colors.dark }]}>{count}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.terracotta} />
          </View>
        ) : (
          <ScrollView
            keyboardDismissMode="on-drag"
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.terracotta} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}
          >
            {error ? <ErrorBanner message={error} /> : null}

            {tab === 'friends' ? (
              <>
                <View style={styles.searchBox}>
                  <Icon name="search" size={18} color={colors.taupe} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search names, neighborhoods, or notes"
                    placeholderTextColor={colors.taupe}
                    autoCapitalize="none"
                    style={{ flex: 1, fontFamily: fonts.sansSemi, fontSize: 14, color: colors.dark }}
                  />
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                  {(['favorites', 'name', 'recent'] as SortMode[]).map((mode) => (
                    <FilterChip key={mode} label={mode} selected={sortMode === mode} onPress={() => setSortMode(mode)} />
                  ))}
                  <FilterChip label="out now" selected={outOnly} onPress={() => setOutOnly((value) => !value)} />
                </ScrollView>

                <Section title={`${connected.length} connection${connected.length === 1 ? '' : 's'}`} eyebrow="YOUR PEOPLE">
                  {visibleConnections.length ? visibleConnections.map((item) => (
                    <VillageRow
                      key={item.connection.id}
                      name={item.parent.display_name}
                      subtitle={`${item.parent.neighborhood ?? 'Village parent'}${outIds.has(item.parent.id) ? ' · out now' : ''}`}
                      initials={item.parent.avatar_initials}
                      tone={item.parent.avatar_color as AvatarTone}
                      imageUrl={item.parent.avatar_url}
                      onPress={() => router.push(`/profile/${item.parent.id}`)}
                      action={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Pressable onPress={() => toggleFavorite(item)} hitSlop={10} style={styles.rowAction}>
                            {busyId === `favorite-${item.parent.id}` ? <ActivityIndicator size="small" color={colors.terracotta} /> : (
                              <Icon name={item.preference.favorite ? 'star.fill' : 'star'} size={19} color={item.preference.favorite ? colors.amberLight : colors.taupe} />
                            )}
                          </Pressable>
                          <Pressable onPress={() => router.push(`/connection-manage/${item.parent.id}` as never)} hitSlop={10} style={styles.rowAction}>
                            <Icon name="ellipsis" size={20} color={colors.taupe} />
                          </Pressable>
                        </View>
                      }
                    />
                  )) : <EmptyCopy text={connected.length ? 'No connections match these filters.' : 'Invite a parent to start building your village.'} />}
                </Section>

                {suggestions.length ? (
                  <Section title="people you may know" eyebrow="MUTUAL CONNECTIONS">
                    {suggestions.map((person) => (
                      <VillageRow
                        key={person.id}
                        name={person.display_name}
                        subtitle={`${person.mutual_count} mutual connection${person.mutual_count === 1 ? '' : 's'}${person.neighborhood ? ` · ${person.neighborhood}` : ''}`}
                        initials={person.avatar_initials}
                        tone={person.avatar_color as AvatarTone}
                        imageUrl={person.avatar_url}
                        action={<SmallButton label="say hello" filled loading={busyId === `request-${person.id}`} onPress={() => run(`request-${person.id}`, () => data.requestConnection(person.id))} />}
                      />
                    ))}
                  </Section>
                ) : null}
              </>
            ) : null}

            {tab === 'requests' ? (
              <>
                <Section title="waiting for you" eyebrow="SAY HELLO">
                  {incoming.length ? incoming.map((item) => (
                    <VillageRow
                      key={item.connection.id}
                      name={item.parent.display_name}
                      subtitle={item.parent.neighborhood ?? 'Village parent'}
                      initials={item.parent.avatar_initials}
                      tone={item.parent.avatar_color}
                      imageUrl={item.parent.avatar_url}
                      onPress={() => router.push(`/profile/${item.parent.id}`)}
                      action={<View style={{ flexDirection: 'row', gap: 6 }}>
                        <SmallButton label="accept" filled loading={busyId === `accept-${item.parent.id}`} onPress={() => run(`accept-${item.parent.id}`, () => data.acceptConnection(item.parent.id))} />
                        <SmallButton label="decline" loading={busyId === `decline-${item.parent.id}`} onPress={() => run(`decline-${item.parent.id}`, () => data.declineConnection(item.parent.id))} />
                      </View>}
                    />
                  )) : <EmptyCopy text="No incoming requests right now." />}
                </Section>

                <Section title="sent requests" eyebrow="WAITING ON THEM">
                  {outgoing.length ? outgoing.map((item) => (
                    <VillageRow
                      key={item.connection.id}
                      name={item.parent.display_name}
                      subtitle={`Sent ${relativeDate(item.connection.created_at)}`}
                      initials={item.parent.avatar_initials}
                      tone={item.parent.avatar_color}
                      imageUrl={item.parent.avatar_url}
                      action={<SmallButton label="cancel" loading={busyId === `cancel-${item.parent.id}`} onPress={() => run(`cancel-${item.parent.id}`, () => data.cancelConnectionRequest(item.parent.id))} />}
                    />
                  )) : <EmptyCopy text="No sent requests are waiting." />}
                </Section>

                <Section title="notifications" eyebrow="KEEP ME POSTED">
                  <ToggleRow label="New connection requests" value={notifications.connection_requests} onValueChange={(value) => updateNotification('connection_requests', value)} />
                  <ToggleRow label="Accepted requests" value={notifications.connection_acceptances} onValueChange={(value) => updateNotification('connection_acceptances', value)} />
                  <ToggleRow label="Invite redemptions" value={notifications.invite_redemptions} onValueChange={(value) => updateNotification('invite_redemptions', value)} />
                  <ToggleRow label="Plan invitations" value={notifications.plan_invitations} onValueChange={(value) => updateNotification('plan_invitations', value)} />
                </Section>
              </>
            ) : null}

            {tab === 'invites' ? (
              <>
                <Pressable onPress={() => router.push('/add-to-village' as never)} style={styles.heroAction}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="qrcode" size={24} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansExtra, fontSize: 15, color: colors.white }}>Invite a parent</Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.82)', paddingTop: 2 }}>Share a private link, QR code, or email</Text>
                  </View>
                  <Icon name="chevron.right" size={18} color={colors.white} />
                </Pressable>
                <Section title="active invites" eyebrow="PRIVATE & EXPIRING">
                  {activeInvites.length ? activeInvites.map((invite) => (
                    <View key={invite.id} style={styles.inviteRow}>
                      <View style={{ flex: 1 }}>
                        <Text selectable style={{ fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: 1.2, color: colors.dark }}>{invite.code}</Text>
                        <Text style={styles.secondaryText}>{invite.use_count} of {invite.max_uses} joined · expires {shortDate(invite.expires_at)}</Text>
                      </View>
                      <SmallButton label="revoke" loading={busyId === `revoke-${invite.id}`} onPress={() => run(`revoke-${invite.id}`, () => data.revokeConnectionInvite(invite.id))} />
                    </View>
                  )) : <EmptyCopy text="Create an invite when you’re ready to grow your village." />}
                </Section>
              </>
            ) : null}

            {tab === 'blocked' ? (
              <Section title="blocked parents" eyebrow="PRIVATE TO YOU">
                {blocked.length ? blocked.map((person) => (
                  <VillageRow
                    key={person.id}
                    name={person.display_name}
                    subtitle={`Blocked ${relativeDate(person.blocked_at)}`}
                    initials={person.avatar_initials}
                    tone={person.avatar_color as AvatarTone}
                    imageUrl={person.avatar_url}
                    action={<SmallButton label="unblock" loading={busyId === `unblock-${person.id}`} onPress={() => {
                      Alert.alert(`Unblock ${person.display_name}?`, 'They will not be reconnected automatically.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Unblock', onPress: () => run(`unblock-${person.id}`, () => data.unblockParent(person.id)) },
                      ]);
                    }} />}
                  />
                )) : <EmptyCopy text="Parents you block will appear here. They can’t find your profile or see your activity." />}
              </Section>
            ) : null}
          </ScrollView>
        )}
      </KeyboardFrame>
    </SafeAreaView>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={{ fontFamily: fonts.serifRegular, fontSize: 25, color: colors.dark, paddingTop: 2 }}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function VillageRow({ name, subtitle, initials, tone, imageUrl, action, onPress }: {
  name: string;
  subtitle: string;
  initials: string;
  tone: AvatarTone;
  imageUrl: string | null;
  action?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.personRow}>
      <AvatarCircle initials={initials} tone={tone} imageUrl={imageUrl} size={45} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.secondaryText}>{subtitle}</Text>
      </View>
      {action}
    </Pressable>
  );
}

function SmallButton({ label, onPress, filled = false, loading = false }: { label: string; onPress: () => void; filled?: boolean; loading?: boolean }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={[styles.smallButton, filled && { backgroundColor: colors.terracotta, borderColor: colors.terracotta }]}>
      {loading ? <ActivityIndicator size="small" color={filled ? colors.white : colors.terracotta} /> : (
        <Text style={{ fontFamily: fonts.sansExtra, fontSize: 10.5, color: filled ? colors.white : colors.brownMid }}>{label}</Text>
      )}
    </Pressable>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, selected && styles.tabSelected]}><Text style={[styles.tabText, selected && { color: colors.white }]}>{label}</Text></Pressable>;
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}><Text style={styles.rowName}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.rule, true: colors.sage }} /></View>;
}

function EmptyCopy({ text }: { text: string }) {
  return <Text style={{ fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: colors.taupe, padding: 16, textAlign: 'center' }}>{text}</Text>;
}

function ErrorBanner({ message }: { message: string }) {
  return <View style={{ padding: 12, borderRadius: radii.md, backgroundColor: '#FCE8E2' }}><Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 17, color: colors.terracotta }}>{message}</Text></View>;
}

function relativeDate(value: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

const styles = {
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  tabSelected: { backgroundColor: colors.dark, borderColor: colors.dark } as const,
  tabText: { fontFamily: fonts.sansExtra, fontSize: 10.5, color: colors.brownMid } as const,
  tabCount: { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream } as const,
  tabCountSelected: { backgroundColor: colors.white } as const,
  tabCountText: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 11, color: colors.brownMid } as const,
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, height: 45, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  sectionCard: { overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  personRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  rowName: { fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.dark } as const,
  secondaryText: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.taupe, paddingTop: 2 } as const,
  rowAction: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center' } as const,
  smallButton: { minWidth: 58, minHeight: 32, paddingHorizontal: 10, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.rule } as const,
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radii.lg, backgroundColor: colors.terracotta } as const,
  inviteRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  toggleRow: { minHeight: 56, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
};
