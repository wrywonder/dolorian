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
import { AvatarCircle, Icon, PhotoTile, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii, spacing, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { createLatestRequest } from '@/lib/latest-request';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { readableError } from '@/lib/error-message';
import { planIsUpcoming, planScheduleLabel } from '@/lib/plan-dates';
import { getPlanKind } from '@/lib/plan-intent';
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
  const [showOut, setShowOut] = useState(false);

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

  const { activity, venue, shared_by, goingConnections, interestedConnections, outConnections, myState } = proof;
  const location = activity.location_name ?? venue?.name ?? null;
  const imageUrl = activity.cover_image_url ?? venue?.image_url ?? null;
  const isOwner = activity.created_by === myId;
  const state = myState === 'attended' ? 'going' : myState === 'going' || myState === 'interested' || myState === 'out' ? myState : null;
  const noteChanged = rsvpNote.trim() !== (proof.myRsvpNote?.trim() ?? '');
  const planKind = getPlanKind(activity);
  const isSignup = planKind === 'signup';
  const rsvpCopy = planRsvpCopy(planKind);
  const openListing = () => {
    if (!activity.external_url || !/^https?:\/\//i.test(activity.external_url)) {
      setError('This listing link is unavailable.');
      return;
    }
    Linking.openURL(activity.external_url).catch(() => setError('Could not open that listing. Please try again.'));
  };
  const openDirections = () => {
    if (!activity.location_address?.trim()) return;
    const query = [location, activity.location_address].filter(Boolean).join(', ');
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`).catch(() => setError('Could not open directions. You can copy the address and try your maps app.'));
  };

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
          <View style={styles.titleBlock}>
            {imageUrl ? <Image source={{ uri: imageUrl }} contentFit="cover" transition={180} style={styles.compactImage} /> : <PhotoTile tone={toneForActivity(activity.emoji)} height={8} radius={radii.sm} />}
            <View style={styles.summaryTop}>
              <View style={styles.badges}><Badge label={visibilityLabel(activity.visibility)} />{activity.cancelled_at ? <Badge label="CANCELLED" alert /> : null}</View>
              {activity.emoji ? <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.emoji}>{activity.emoji}</Text> : null}
            </View>
            <Text selectable style={styles.title}>{activity.name}</Text>
            <Text selectable style={styles.date}>{planScheduleLabel(activity)}</Text>
            {location ? <InfoLine icon="map.pin" text={location} /> : null}
            {activity.location_address ? <View style={styles.addressRow}><Text selectable style={styles.address}>{activity.location_address}</Text><Pressable accessibilityRole="link" accessibilityLabel="Open directions" onPress={openDirections} style={styles.directionsButton}><Text style={styles.linkText}>directions ↗</Text></Pressable></View> : null}
            {shared_by ? <Pressable accessibilityRole="button" accessibilityLabel={`Shared by ${shared_by.display_name}`} disabled={!shared_by.profile_visible} onPress={() => router.push(`/profile/${shared_by.parent_id}` as never)} style={styles.sharedByRow}>
              <AvatarCircle initials={shared_by.avatar_initials} tone={shared_by.avatar_color} imageUrl={shared_by.avatar_url} size={30} />
              <Text style={styles.sharedByText}>Shared by {isOwner ? 'you' : shared_by.display_name}</Text>
            </Pressable> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.eyebrow}>{isSignup ? 'YOUR SIGNUP STATUS' : 'YOUR RESPONSE'}</Text>
            <Text style={styles.sectionTitle}>{activity.cancelled_at ? 'this plan was cancelled' : rsvpCopy.prompt}</Text>
            {!activity.cancelled_at ? (
              <>
                {isSignup ? <View style={{ gap: spacing.sm }}>
                  <Text style={styles.helpLeft}>Sign up with the organizer, then let friends know.</Text>
                  {activity.external_url ? <Pressable accessibilityRole="link" onPress={openListing} style={styles.signupButton}><Text style={styles.signupButtonText}>open signup page ↗</Text></Pressable> : null}
                </View> : null}
                {activity.schedule_kind === 'weekly' ? <Text style={styles.helpLeft}>One response for the whole plan. Add any exceptions below.</Text> : null}
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

          {goingConnections.length ? <ParticipantSection title={`Other parents · ${rsvpCopy.goingGroup}`} people={goingConnections} /> : null}
          {interestedConnections.length ? <ParticipantSection title={`Other parents · ${rsvpCopy.interestedGroup}`} people={interestedConnections} /> : null}
          {!goingConnections.length && !interestedConnections.length ? <View style={styles.section}>
            <Text style={styles.eyebrow}>WHO’S IN?</Text>
            <Text style={styles.helpLeft}>No other parents are in yet.</Text>
          </View> : null}
          {outConnections.length ? <View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showOut }} onPress={() => setShowOut((open) => !open)} style={styles.outToggle}><Text style={styles.clearText}>{outConnections.length} {outConnections.length === 1 ? 'parent' : 'parents'} · {rsvpCopy.out.toLowerCase()} {showOut ? '↑' : '↓'}</Text></Pressable>
            {showOut ? <ParticipantSection title={rsvpCopy.out} people={outConnections} subdued /> : null}
          </View> : null}

          {activity.description || (!isSignup && activity.external_url) ? <View style={styles.section}>
            <Text style={styles.eyebrow}>A FEW DETAILS</Text>
            {activity.description ? <Text selectable style={styles.description}>{activity.description}</Text> : null}
            {!isSignup && activity.external_url ? <Pressable accessibilityRole="link" onPress={openListing} style={styles.linkButton}><Icon name="link" size={16} color={colors.terracotta} /><Text style={styles.linkText}>open shared link ↗</Text></Pressable> : null}
          </View> : null}

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

function ParticipantSection({ title, people, subdued = false }: { title: string; people: PlanParticipant[]; subdued?: boolean }) {
  return (
    <View style={[styles.section, subdued && { opacity: 0.75 }]}>
      <Text style={styles.eyebrow}>{title.toUpperCase()} · {people.length}</Text>
      {people.map((person) => (
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
      ))}
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
  if (visibility === 'connections') return 'MY CONNECTIONS';
  if (visibility === 'invited') return 'CHOSEN FRIENDS';
  return 'PUBLIC';
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
  compactImage: { width: '100%', height: 80, borderRadius: radii.md } as const,
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm } as const,
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as const,
  badge: { backgroundColor: 'rgba(255,253,246,0.94)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 } as const,
  badgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.4, color: colors.dark } as const,
  titleBlock: { marginHorizontal: 14, padding: 18, gap: 9, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.rule } as const,
  emoji: { fontSize: 34 } as const,
  title: { fontFamily: fonts.serifRegular, fontSize: 32, lineHeight: 35, color: colors.dark } as const,
  date: { fontFamily: fonts.sansExtra, fontSize: 13, lineHeight: 19, color: colors.terracotta } as const,
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 7 } as const,
  infoText: { flex: 1, fontFamily: fonts.sansBold, fontSize: 13, color: colors.dark } as const,
  addressRow: { marginLeft: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm } as const,
  address: { flex: 1, minWidth: 140, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.brownMid } as const,
  directionsButton: { minHeight: 44, justifyContent: 'center' } as const,
  sharedByRow: { flexDirection: 'row', gap: spacing.sm, minHeight: 44, alignItems: 'center' } as const,
  sharedByText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 12, color: colors.brownMid } as const,
  signupButton: { minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.terracotta, alignItems: 'center', justifyContent: 'center' } as const,
  signupButtonText: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.white } as const,
  outToggle: { minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: 'center' } as const,
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
  saveNoteButton: { minHeight: 44, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.terracotta, alignItems: 'center', justifyContent: 'center' } as const,
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
