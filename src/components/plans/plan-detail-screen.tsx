import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FormScrollView as ScrollView } from '@/components/ui/FormScrollView';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { AvatarCircle, Icon, PhotoTile, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { createLatestRequest } from '@/lib/latest-request';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { readableError } from '@/lib/error-message';
import { planIsUpcoming } from '@/lib/plan-dates';
import { planRsvpCopy } from '@/lib/plan-rsvp-copy';
import type { ActivitySocialProof, InteractionState, PlanParticipant, UUID } from '@/types';

type PlanDetailScreenProps = { id: UUID };
type RsvpState = Extract<InteractionState, 'going' | 'interested' | 'out'>;

export function PlanDetailScreen({ id }: PlanDetailScreenProps) {
  const [proof, setProof] = useState<ActivitySocialProof | null>(null);
  const [myId, setMyId] = useState<UUID | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests] = useState(createLatestRequest);
  const savedNote = useRef('');
  const loadedId = useRef<UUID | null>(null);
  const mutationPending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [rsvpNote, setRsvpNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const isCurrent = requests.begin();
    setError(null);
    try {
      const [nextProof, me] = await Promise.all([data.getPlan(id), data.getCurrentUser()]);
      if (!isCurrent()) return;
      setProof(nextProof);
      setMyId(me.id);
      const nextNote = nextProof?.myRsvpNote?.trim() ?? '';
      const samePlan = loadedId.current === id;
      const previousNote = savedNote.current;
      setRsvpNote((draft) => samePlan && draft.trim() !== previousNote ? draft : nextNote);
      savedNote.current = nextNote;
      loadedId.current = id;
      if (!nextProof) setError('This plan is unavailable or was shared with a different audience.');
    } catch (cause) {
      if (isCurrent()) setError(readableError(cause, 'Could not load this plan. Try again when you’re connected.'));
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  }, [id, requests]);

  const refresh = useCallback(() => {
    if (!mutationPending.current) void load();
  }, [load]);
  useRefreshOnFocus(refresh, requests.invalidate);

  const onRefresh = () => {
    if (mutationPending.current) return;
    setRefreshing(true);
    void load();
  };

  const setRsvp = async (next: RsvpState | null, note = rsvpNote) => {
    if (!proof || mutationPending.current || proof.activity.cancelled_at) return;
    mutationPending.current = true;
    requests.invalidate();
    setSaving(true);
    setError(null);
    try {
      if (next) await data.setPlanRsvp(id, next, note);
      else await data.clearPlanRsvp(id);
      const persistedNote = next ? note.trim() : '';
      savedNote.current = persistedNote;
      setRsvpNote(persistedNote);
      setProof((current) => current ? { ...current, myState: next, myRsvpNote: persistedNote || null } : current);
      await load();
    } catch (cause) {
      setError(readableError(cause, 'Could not update your response.'));
    } finally {
      mutationPending.current = false;
      setSaving(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel this plan?',
      'It will stay visible with a cancelled label so everyone has the same information.',
      [
        { text: 'Keep plan', style: 'cancel' },
        {
          text: 'Cancel plan',
          style: 'destructive',
          onPress: async () => {
            if (mutationPending.current) return;
            mutationPending.current = true;
            requests.invalidate();
            setSaving(true);
            try {
              await data.cancelPlan(id);
              setProof((current) => current ? { ...current, activity: { ...current.activity, cancelled_at: new Date().toISOString() } } : current);
              await load();
            } catch (cause) {
              setError(readableError(cause, 'Could not cancel this plan.'));
            } finally {
              mutationPending.current = false;
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.terracotta} /></SafeAreaView>;
  }

  if (!proof) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>plan unavailable</Text>
        <Text selectable style={styles.help}>{error}</Text>
        <TerracottaButton label="try again" onPress={() => { setLoading(true); void load(); }} />
        <TerracottaButton label="go back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const { activity, venue, goingConnections, interestedConnections, outConnections, myState } = proof;
  const location = activity.location_name ?? venue?.name ?? null;
  const imageUrl = activity.cover_image_url ?? venue?.image_url ?? null;
  const isOwner = activity.created_by === myId;
  const state = myState === 'going' || myState === 'interested' || myState === 'out' ? myState : null;
  const noteChanged = rsvpNote.trim() !== (proof.myRsvpNote?.trim() ?? '');
  const rsvpCopy = planRsvpCopy(Boolean(activity.external_url));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <RoundButton label="Back" onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </RoundButton>
        <Text style={styles.headerTitle}>plan details</Text>
        {isOwner && !activity.cancelled_at ? (
          <Pressable onPress={() => router.push(`/plan/${id}/edit` as never)} style={styles.editButton}>
            <Text style={styles.editText}>edit</Text>
          </Pressable>
        ) : <View style={{ width: 48 }} />}
      </View>

      <KeyboardFrame style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.terracotta} />}
        >
          {error ? <View style={styles.retryNotice}><Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" disabled={saving} onPress={onRefresh} style={styles.retryButton}><Text style={styles.clearText}>try again →</Text></Pressable></View> : null}
          <View style={styles.hero}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} contentFit="cover" transition={180} style={{ width: '100%', height: 250 }} />
            ) : (
              <PhotoTile tone={toneForActivity(activity.emoji)} height={120} />
            )}
            <View style={styles.heroBadges}>
              <Badge label={visibilityLabel(activity.visibility)} />
              {activity.cancelled_at ? <Badge label="CANCELLED" alert /> : null}
            </View>
          </View>

          <View style={styles.titleBlock}>
            {activity.emoji ? <Text style={styles.emoji}>{activity.emoji}</Text> : null}
            <Text selectable style={styles.title}>{activity.name}</Text>
            <Text style={styles.date}>{formatPlanDate(activity.starts_at, activity.ends_at, activity.all_day)}</Text>
            {location ? <InfoLine icon="map.pin" text={location} /> : null}
            {activity.location_address ? <Text selectable style={styles.address}>{activity.location_address}</Text> : null}
            {activity.description ? <Text selectable style={styles.description}>{activity.description}</Text> : null}
            {activity.external_url ? (
              <Pressable accessibilityRole="link" onPress={() => {
                Linking.openURL(activity.external_url!).catch(() => setError('Could not open that listing. Please try again.'));
              }} style={styles.linkButton}>
                <Icon name="arrow.right" size={16} color={colors.terracotta} />
                <Text style={styles.linkText}>open original listing</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.eyebrow}>YOUR RSVP</Text>
            <Text style={styles.sectionTitle}>{activity.cancelled_at ? 'this plan was cancelled' : rsvpCopy.prompt}</Text>
            {!activity.cancelled_at ? (
              <>
                <View style={styles.rsvpRow}>
                  <RsvpButton label={rsvpCopy.going} emoji="✓" selected={state === 'going'} disabled={saving} onPress={() => setRsvp('going')} />
                  <RsvpButton label={rsvpCopy.interested} emoji="♡" selected={state === 'interested'} disabled={saving} onPress={() => setRsvp('interested')} />
                  <RsvpButton label={rsvpCopy.out} emoji="×" selected={state === 'out'} disabled={saving} onPress={() => setRsvp('out')} />
                </View>
                {state ? (
                  <View style={styles.rsvpDetails}>
                    <Text style={styles.rowLabel}>{rsvpCopy.detailsLabel}</Text>
                    <Text style={styles.helpLeft}>{rsvpCopy.detailsHelp}</Text>
                    <TextInput
                      editable={!saving}
                      accessibilityLabel={rsvpCopy.detailsLabel}
                      value={rsvpNote}
                      onChangeText={setRsvpNote}
                      maxLength={500}
                      multiline
                      placeholder={rsvpCopy.detailsPlaceholder}
                      placeholderTextColor={colors.taupe}
                      style={styles.rsvpNote}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={() => setRsvp(null)}><Text style={styles.clearText}>clear my response</Text></Pressable>
                      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !noteChanged, busy: saving }} disabled={saving || !noteChanged} onPress={() => setRsvp(state)} style={[styles.saveNoteButton, !noteChanged && { opacity: 0.42 }]}>
                        <Text style={styles.saveNoteText}>{saving ? 'saving…' : 'save details'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          {!activity.cancelled_at && activity.starts_at && !planIsUpcoming(activity, new Date()) ? (
            <View style={styles.section}>
              <Text style={styles.eyebrow}>THE GOOD BITS</Text>
              <Text style={styles.sectionTitle}>a little memory for the village</Text>
              <Text style={styles.helpLeft}>Share a photo from this plan with your connections.</Text>
              <TerracottaButton label="share a memory →" onPress={() => router.push({ pathname: '/compose', params: { activityId: activity.id } })} fullWidth />
            </View>
          ) : null}

          <ParticipantSection title={rsvpCopy.going} people={goingConnections} empty={activity.external_url ? 'No other families have marked themselves signed up yet.' : 'No one else has said they’re going yet.'} />
          <ParticipantSection title={rsvpCopy.interested} people={interestedConnections} empty="No one else is watching this one yet." />
          {outConnections.length ? <ParticipantSection title={rsvpCopy.out} people={outConnections} empty="" subdued /> : null}

          {isOwner && !activity.cancelled_at ? (
            <Pressable disabled={saving} onPress={confirmCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>cancel this plan</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardFrame>
    </SafeAreaView>
  );
}

function ParticipantSection({ title, people, empty, subdued = false }: { title: string; people: PlanParticipant[]; empty: string; subdued?: boolean }) {
  return (
    <View style={[styles.section, subdued && { opacity: 0.75 }]}>
      <Text style={styles.eyebrow}>{title.toUpperCase()} · {people.length}</Text>
      {people.length ? people.map((person) => (
        <Pressable
          key={person.parent_id}
          disabled={!person.profile_visible}
          onPress={() => router.push(`/profile/${person.parent_id}` as never)}
          style={styles.personRow}
        >
          <AvatarCircle initials={person.avatar_initials} tone={person.avatar_color} imageUrl={person.avatar_url} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{person.display_name}</Text>
            <Text style={styles.help}>{person.neighborhood ?? (person.profile_visible ? 'Village connection' : 'Village parent')}</Text>
            {person.rsvp_note ? <Text selectable style={styles.participantNote}>{person.rsvp_note}</Text> : null}
          </View>
          {person.profile_visible ? <Icon name="chevron.right" size={16} color={colors.taupe} /> : null}
        </Pressable>
      )) : <Text style={styles.help}>{empty}</Text>}
    </View>
  );
}

function RsvpButton({ label, emoji, selected, disabled, onPress }: { label: string; emoji: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={[styles.rsvpButton, selected && styles.rsvpSelected]}>
      <Text style={[styles.rsvpEmoji, selected && { color: colors.white }]}>{emoji}</Text>
      <Text style={[styles.rsvpLabel, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.roundButton}>{children}</Pressable>;
}

function Badge({ label, alert = false }: { label: string; alert?: boolean }) {
  return <View style={[styles.badge, alert && { backgroundColor: colors.terracotta }]}><Text style={[styles.badgeText, alert && { color: colors.white }]}>{label}</Text></View>;
}

function InfoLine({ icon, text }: { icon: 'map.pin'; text: string }) {
  return <View style={styles.infoLine}><Icon name={icon} size={16} color={colors.terracotta} /><Text selectable style={styles.infoText}>{text}</Text></View>;
}

function visibilityLabel(visibility: ActivitySocialProof['activity']['visibility']): string {
  if (visibility === 'connections') return 'MY VILLAGE';
  if (visibility === 'invited') return 'INVITED ONLY';
  return 'PUBLIC';
}

function formatPlanDate(startIso: string | null, endIso: string | null, allDay: boolean): string {
  if (!startIso) return 'Date to be announced';
  const start = new Date(startIso);
  const day = format(start, 'EEEE, MMMM d');
  const startTime = format(start, 'h:mm a').replace(':00', '');
  if (!endIso) return allDay ? `${day} · all day` : `${day} · ${startTime}`;
  const end = new Date(endIso);
  if (allDay) {
    return format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
      ? `${day} · all day`
      : `${day} – ${format(end, 'EEEE, MMMM d')} · all day`;
  }
  return format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
    ? `${day} · ${startTime}–${format(end, 'h:mm a').replace(':00', '')}`
    : `${day} · ${startTime} – ${format(end, 'EEEE, MMMM d · h:mm a').replace(':00', '')}`;
}

function toneForActivity(emoji: string | null): AvatarTone {
  if (emoji === '⚽' || emoji === '☀️') return 'golden';
  if (emoji === '🥾' || emoji === '🌳') return 'sage';
  if (emoji === '🩰' || emoji === '📚') return 'mauve';
  if (emoji === '🏊') return 'slate';
  if (emoji === '🎂') return 'peach';
  if (emoji === '🎶') return 'rose';
  return 'butter';
}

const styles = {
  retryNotice: { marginHorizontal: 14, padding: 14, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule } as const,
  retryButton: { minHeight: 40, justifyContent: 'center' } as const,
  center: { flex: 1, backgroundColor: colors.cream, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 16 } as const,
  header: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as const,
  headerTitle: { fontFamily: fonts.serifRegular, fontSize: 23, color: colors.dark } as const,
  roundButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' } as const,
  editButton: { width: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center' } as const,
  editText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
  content: { paddingBottom: 60, gap: 14 } as const,
  hero: { marginHorizontal: 14, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.rule, position: 'relative' } as const,
  heroBadges: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', gap: 6 } as const,
  badge: { backgroundColor: 'rgba(255,253,246,0.94)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 } as const,
  badgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: colors.dark } as const,
  titleBlock: { marginHorizontal: 14, padding: 18, gap: 9, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.rule } as const,
  emoji: { fontSize: 34 } as const,
  title: { fontFamily: fonts.serifRegular, fontSize: 32, lineHeight: 35, color: colors.dark } as const,
  date: { fontFamily: fonts.sansExtra, fontSize: 13, lineHeight: 19, color: colors.terracotta } as const,
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 7 } as const,
  infoText: { flex: 1, fontFamily: fonts.sansBold, fontSize: 13, color: colors.dark } as const,
  address: { marginLeft: 23, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.taupe } as const,
  description: { fontFamily: fonts.serifRegular, fontSize: 17, lineHeight: 24, color: colors.brownMid } as const,
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 3 } as const,
  linkText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
  section: { marginHorizontal: 14, padding: 16, gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.lg } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  sectionTitle: { fontFamily: fonts.serifRegular, fontSize: 24, lineHeight: 27, color: colors.dark } as const,
  rsvpRow: { flexDirection: 'row', gap: 8 } as const,
  rsvpButton: { flex: 1, minHeight: 64, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', gap: 3 } as const,
  rsvpSelected: { backgroundColor: colors.terracotta, borderColor: colors.terracotta } as const,
  rsvpEmoji: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.terracotta } as const,
  rsvpLabel: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.dark } as const,
  rsvpDetails: { gap: 8, paddingTop: 4 } as const,
  rsvpNote: { minHeight: 78, paddingHorizontal: 12, paddingTop: 11, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 18, color: colors.dark, textAlignVertical: 'top' } as const,
  saveNoteButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.terracotta, alignItems: 'center', justifyContent: 'center' } as const,
  saveNoteText: { fontFamily: fonts.sansExtra, fontSize: 11, color: colors.white } as const,
  clearText: { alignSelf: 'center', fontFamily: fonts.sansBold, fontSize: 11, color: colors.taupe, padding: 5 } as const,
  personRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 } as const,
  personName: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.dark } as const,
  help: { textAlign: 'center', fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.taupe } as const,
  helpLeft: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.taupe } as const,
  rowLabel: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.dark } as const,
  participantNote: { paddingTop: 5, fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, color: colors.brownMid } as const,
  error: { marginHorizontal: 16, fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
  cancelButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 11 } as const,
  cancelText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta } as const,
  emptyTitle: { fontFamily: fonts.serifRegular, fontSize: 28, color: colors.dark } as const,
};
