import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormScrollView } from '@/components/ui/FormScrollView';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { PlanPlacePicker } from './PlanPlacePicker';
import { PlanDateField } from './plan-date-field';
import { colors, fonts, radii, spacing } from '@/lib/constants';
import { data } from '@/lib/data';
import { createLatestRequest } from '@/lib/latest-request';
import { applyPlanLinkPreview, isSamePlanImportSource, PLAN_IMPORT_TEXT_FIELDS, type PlanImportTextField } from '@/lib/plan-import-draft';
import { clearPlanDate, draftFromPlan, emptyPlanDraft, planInputFromDraft, shiftPlanDate, weekdayForDate, type PlanEditorDraft } from '@/lib/plan-editor-draft';
import { getDeviceTimeZone, planDateKey } from '@/lib/plan-schedule';
import { readableError } from '@/lib/error-message';
import type { ActivitySocialProof, ConnectionView, PlanLinkPreview, PlanVisibility, PlanWeekday, UUID } from '@/types';

const AUDIENCES: { value: PlanVisibility; label: string; detail: string; icon: 'sun' | 'person.2' | 'lock' }[] = [
  { value: 'connections', label: 'My connections', detail: 'Everyone you’re connected with.', icon: 'person.2' },
  { value: 'invited', label: 'Choose friends', detail: 'Only the people you pick.', icon: 'lock' },
  { value: 'public', label: 'Public', detail: 'Any signed-in Village parent.', icon: 'sun' },
];
const WEEKDAYS: { value: PlanWeekday; short: string; name: string }[] = [
  { value: 1, short: 'M', name: 'Monday' }, { value: 2, short: 'T', name: 'Tuesday' },
  { value: 3, short: 'W', name: 'Wednesday' }, { value: 4, short: 'T', name: 'Thursday' },
  { value: 5, short: 'F', name: 'Friday' }, { value: 6, short: 'S', name: 'Saturday' },
  { value: 0, short: 'S', name: 'Sunday' },
];
const EMOJIS = ['✨', '🍕', '⚽', '☀️', '🎂', '🌳', '🎨', '🏊', '🏡'];

export function PlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const navigation = useNavigation();
  const [draft, setDraft] = useState(emptyPlanDraft);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [loading, setLoading] = useState(editing);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [canEdit, setCanEdit] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [choosingPlace, setChoosingPlace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<PlanLinkPreview | null>(null);
  const [existingPlan, setExistingPlan] = useState<ActivitySocialProof | null>(null);
  const [createSeparatePlan, setCreateSeparatePlan] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState('');
  const [importRequests] = useState(createLatestRequest);
  const importPending = useRef(false);
  const savePending = useRef(false);
  const leaveAllowed = useRef(false);
  const previousImport = useRef<PlanLinkPreview | null>(null);
  const savedSource = useRef<{ url: string; sourceKey: string } | null>(null);
  const ownedImportText = useRef(new Set<PlanImportTextField>());
  const ownedImportSchedule = useRef(false);
  const busy = importing || saving || !canEdit;
  const update = (patch: Partial<PlanEditorDraft>) => {
    for (const field of PLAN_IMPORT_TEXT_FIELDS) if (field in patch) ownedImportText.current.add(field);
    if (['date', 'time', 'endDate', 'endTime', 'allDay', 'repeating', 'days'].some((field) => field in patch)) ownedImportSchedule.current = true;
    setDraft((current) => ({ ...current, ...patch }));
  };

  usePreventRemove(!loading && canEdit && (JSON.stringify(draft) !== baseline || saving), ({ data: event }) => {
    if (leaveAllowed.current) { navigation.dispatch(event.action); return; }
    if (savePending.current) return;
    Alert.alert('Leave this plan?', 'Your changes haven’t been shared yet.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(event.action) },
    ]);
  });

  useEffect(() => {
    let active = true;
    setLoading(editing);
    setLoadingConnections(true);
    setCanEdit(!editing);
    setLoadError(null);
    Promise.all([data.getConnectionViews(), id ? data.getPlan(id) : Promise.resolve(null), id ? data.getPlanInviteeIds(id) : Promise.resolve([]), data.getCurrentUser()])
      .then(([rows, proof, invitees, me]) => {
        if (!active) return;
        const accepted = rows.filter((row) => row.connection.status === 'connected');
        setConnections(accepted);
        if (!id) return;
        if (!proof || proof.activity.created_by !== me.id || proof.activity.cancelled_at) {
          setLoadError('This plan is unavailable or you cannot edit it.'); return;
        }
        const acceptedIds = new Set(accepted.map((row) => row.parent.id));
        const next = draftFromPlan(proof.activity, invitees.filter((parentId) => acceptedIds.has(parentId)), proof.venue?.name);
        savedSource.current = { url: next.sourceUrl, sourceKey: next.sourceKey };
        ownedImportText.current = new Set(PLAN_IMPORT_TEXT_FIELDS.filter((field) => Boolean(next[field])));
        ownedImportSchedule.current = false;
        setDraft(next); setBaseline(JSON.stringify(next)); setCanEdit(true);
        setDetailsOpen(Boolean(next.description || next.sourceUrl || next.planKind === 'signup'));
        setScheduleOpen(next.repeating || Boolean(next.endDate && next.endDate !== next.date));
      }).catch((cause) => { if (active) setLoadError(readableError(cause, 'Could not load your connections and plan.')); })
      .finally(() => { if (active) { setLoading(false); setLoadingConnections(false); } });
    return () => { active = false; importRequests.invalidate(); };
  }, [id, editing, importRequests, loadAttempt]);

  const changeUrl = (sourceUrl: string) => {
    importRequests.invalidate(); importPending.current = false; setImporting(false);
    update({ sourceUrl, sourceKey: '' }); setImportResult(null); setExistingPlan(null); setCreateSeparatePlan(false);
  };
  const importLink = async () => {
    if (savePending.current || importPending.current || choosingPlace || !canEdit) return;
    if (!draft.sourceUrl.trim()) { setError('Paste a link first.'); return; }
    Keyboard.dismiss();
    const current = importRequests.begin();
    importPending.current = true; setImporting(true); setError(null);
    try {
      const preview = await data.importPlanLink(draft.sourceUrl.trim());
      if (!current()) return;
      const match = await data.findExistingPlan(preview.sourceKey, preview.url, id);
      if (!current()) return;
      const sameSource = isSamePlanImportSource(previousImport.current ?? savedSource.current, preview);
      const fields = applyPlanLinkPreview(draft, preview, previousImport.current, {
        preserveExisting: sameSource && Boolean(savedSource.current),
        preserveSchedule: sameSource && (draft.repeating || ownedImportSchedule.current),
        ownedTextFields: ownedImportText.current,
      });
      // Imported values are not user edits. Keep that distinction for the next reread.
      setDraft((currentDraft) => ({ ...currentDraft, ...fields, sourceUrl: preview.url, sourceKey: preview.sourceKey, repeating: sameSource && draft.repeating, days: sameSource ? draft.days : [] }));
      if (!sameSource) { savedSource.current = null; ownedImportText.current.clear(); ownedImportSchedule.current = false; }
      setDetailsOpen(Boolean(fields.description)); setScheduleOpen((sameSource && draft.repeating) || Boolean(fields.endDate && fields.endDate !== fields.date));
      previousImport.current = preview; setImportResult(preview); setExistingPlan(match); setCreateSeparatePlan(false);
    } catch { if (current()) setError('Could not read that page. Check the link and try again, or keep filling in your draft.'); }
    finally { if (current()) { importPending.current = false; setImporting(false); } }
  };
  const save = async () => {
    if (savePending.current || importPending.current || choosingPlace || !canEdit) return;
    savePending.current = true; setSaving(true); setError(null); Keyboard.dismiss();
    try {
      if (existingPlan && !createSeparatePlan) throw new Error('Open the existing plan, or choose to make a separate plan.');
      const input = planInputFromDraft(draft);
      const plan = id ? await data.updatePlan(id, input) : await data.createPlan(input);
      leaveAllowed.current = true;
      if (editing) router.dismissTo(`/plan/${plan.id}` as never);
      else router.replace(`/plan/${plan.id}` as never);
    } catch (cause) { setError(readableError(cause, 'Could not save this plan. Your draft is still here.')); }
    finally { savePending.current = false; setSaving(false); }
  };
  const toggleInvite = (parentId: UUID) => update({ invitedIds: draft.invitedIds.includes(parentId) ? draft.invitedIds.filter((item) => item !== parentId) : [...draft.invitedIds, parentId] });
  const selectDate = (date: string) => update({ date, endDate: draft.endDate === draft.date ? date : draft.endDate });
  const audienceLabel = draft.visibility === 'invited' ? `${draft.invitedIds.length} friend${draft.invitedIds.length === 1 ? '' : 's'} selected` : draft.visibility === 'public' ? 'Public' : 'My connections';
  const visibleConnections = connections.filter((row) => row.parent.display_name.toLocaleLowerCase().includes(connectionSearch.trim().toLocaleLowerCase()));

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.terracotta} /></SafeAreaView>;
  if (editing && !canEdit) return <SafeAreaView style={styles.center}>
    <Text style={styles.title}>plan unavailable</Text><Text accessibilityRole="alert" style={styles.help}>{loadError}</Text>
    <TerracottaButton label="try again" onPress={() => setLoadAttempt((value) => value + 1)} />
    <TextAction label="go back" onPress={() => router.back()} />
  </SafeAreaView>;

  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={saving} onPress={() => router.back()} style={styles.back}>
        <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
      </Pressable>
      <Text style={styles.title}>{editing ? 'edit plan' : 'make a little plan'}</Text>
    </View>
    <KeyboardFrame>
      <FormScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.sectionTitle}>what’s happening?</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose plan emoji" accessibilityState={{ expanded: emojiOpen }} disabled={busy} onPress={() => { Keyboard.dismiss(); setEmojiOpen(!emojiOpen); }} style={styles.emojiButton}><Text style={styles.emoji}>{draft.emoji}</Text></Pressable>
            <TextInput accessibilityLabel="Plan name" editable={!busy} value={draft.name} onChangeText={(name) => update({ name })} maxLength={140} placeholder="Pizza at ours, anyone?" placeholderTextColor={colors.taupe} style={[styles.field, styles.nameField]} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
          </View>
          {emojiOpen ? <View style={styles.emojiOptions}>{EMOJIS.map((emoji) => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Use ${emoji}`} disabled={busy} onPress={() => { update({ emoji }); setEmojiOpen(false); }} style={styles.emojiButton}><Text style={styles.emoji}>{emoji}</Text></Pressable>)}</View> : null}
          {!importOpen ? <TextAction label="Have a signup link?" disabled={busy} onPress={() => { update({ planKind: 'signup' }); setImportOpen(true); }} /> : null}
        </View>

        {importOpen ? <Section title="bring the details along">
          <Text style={styles.help}>Paste a camp, class, or event link. You can change anything we find.</Text>
          <TextInput accessibilityLabel="Original listing link" editable={!saving && canEdit} value={draft.sourceUrl} onChangeText={changeUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go" onSubmitEditing={importLink} placeholder="https://…" placeholderTextColor={colors.taupe} style={styles.field} />
          <TextAction label={importing ? 'reading the page…' : 'prefill plan details'} disabled={importing || saving || choosingPlace} onPress={importLink} />
          {importing ? <ActivityIndicator color={colors.terracotta} /> : null}
          {importResult ? <Text style={styles.help}>Filled {importResult.importedFields.length} details · review before sharing.</Text> : null}
          {importResult?.warnings.map((warning) => <Text key={warning} selectable style={styles.help}>{warning}</Text>)}
          <Toggle label="Friends sign up separately" value={draft.planKind === 'signup'} disabled={busy} onChange={(value) => update({ planKind: value ? 'signup' : 'gathering' })} />
          <Text style={styles.help}>{draft.planKind === 'signup' ? 'Sign up with the organizer, then tell friends you’re in.' : 'A get-together. Friends can just say they’re going.'}</Text>
          <TextAction label="hide link details" disabled={busy} onPress={() => { setImportOpen(false); setDetailsOpen(Boolean(draft.sourceUrl || draft.planKind === 'signup')); }} />
        </Section> : null}
        {existingPlan && !createSeparatePlan ? <Section title="already in Village">
          <Text style={styles.rowLabel}>{existingPlan.activity.name}</Text><Text style={styles.help}>Join your friends on the existing plan, or share a different session.</Text>
          <TextAction label="open existing plan →" onPress={() => { leaveAllowed.current = true; router.replace(`/plan/${existingPlan.activity.id}` as never); }} />
          <TextAction label="this is a separate plan" onPress={() => setCreateSeparatePlan(true)} />
        </Section> : null}

        <View pointerEvents={busy ? 'none' : 'auto'} style={[styles.sections, importing && { opacity: 0.6 }]}>
          <Section title="when">
            {draft.date ? <>
              <View style={styles.row}>
                <PlanDateField label="START DATE" testID="plan-start-date" mode="date" date={draft.date} time={draft.time} timezone={draft.timezone} onChange={selectDate} />
                {!draft.allDay ? <PlanDateField label="START TIME" testID="plan-start-time" mode="time" date={draft.date} time={draft.time} timezone={draft.timezone} onChange={(time) => update({ time })} /> : null}
              </View>
              {draft.endDate && !draft.repeating ? <View style={styles.row}>
                {scheduleOpen || draft.endDate !== draft.date ? <PlanDateField label="END DATE" testID="plan-end-date" mode="date" date={draft.endDate} time={draft.endTime} timezone={draft.timezone} onChange={(endDate) => update({ endDate })} /> : null}
                {!draft.allDay ? <PlanDateField label="END TIME" testID="plan-end-time" mode="time" date={draft.endDate} time={draft.endTime} timezone={draft.timezone} onChange={(endTime) => update({ endTime })} /> : null}
                <TextAction label="remove end" onPress={() => update({ endDate: '', endTime: '' })} />
              </View> : null}
              {!draft.endDate && !draft.repeating ? <TextAction label="Add an end time" onPress={() => { const endTime = defaultEndTime(draft.time); update({ endDate: endTime <= draft.time ? shiftPlanDate(draft.date, 1) : draft.date, endTime }); }} /> : null}
              <Toggle label="All-day plan" value={draft.allDay} onChange={(allDay) => update({ allDay, time: draft.time || '09:00' })} />
              {!scheduleOpen ? <TextAction label="More than one day" onPress={() => setScheduleOpen(true)} /> : <View style={styles.scheduleOptions}>
                <Toggle label="Repeats weekly" value={draft.repeating} onChange={(repeating) => { const endTime = draft.endTime || defaultEndTime(draft.time); update({ repeating, days: repeating ? [weekdayForDate(draft.date)] : [], endDate: repeating ? (draft.endDate && draft.endDate > draft.date ? draft.endDate : shiftPlanDate(draft.date, 28)) : draft.date, endTime: repeating && endTime <= draft.time ? '' : endTime }); }} />
                {draft.repeating ? <>
                  <View style={styles.weekdays}>{WEEKDAYS.map((day) => <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={`Repeat on ${day.name}`} accessibilityState={{ checked: draft.days.includes(day.value) }} onPress={() => update({ days: draft.days.includes(day.value) ? draft.days.filter((value) => value !== day.value) : [...draft.days, day.value] })} style={[styles.weekday, draft.days.includes(day.value) && styles.selected]}><Text style={[styles.rowLabel, draft.days.includes(day.value) && { color: colors.white }]}>{day.short}</Text></Pressable>)}</View>
                  <View style={styles.row}><TextAction label="Weekdays" onPress={() => update({ days: [1, 2, 3, 4, 5] })} /><TextAction label="Every day" onPress={() => update({ days: [0, 1, 2, 3, 4, 5, 6] })} /></View>
                  <View style={styles.row}>
                    <PlanDateField label="LAST DATE" testID="plan-last-date" mode="date" date={draft.endDate || draft.date} time={draft.endTime} timezone={draft.timezone} onChange={(endDate) => update({ endDate })} />
                    {!draft.allDay ? <PlanDateField label="END TIME" testID="plan-end-time" mode="time" date={draft.date} time={draft.endTime} timezone={draft.timezone} onChange={(endTime) => update({ endTime })} /> : null}
                  </View>
                  <Text style={styles.help}>Same hours on the selected days, through the last date. One response covers the whole plan.</Text>
                </> : <>
                  <Text style={styles.help}>For a trip, add the day it ends. For camp or weekly soccer, turn on repeats.</Text>
                  {!draft.endDate ? <TextAction label="Add a last day" onPress={() => update({ endDate: shiftPlanDate(draft.date, 1), endTime: draft.time })} /> : null}
                </>}
              </View>}
              {draft.timezone !== getDeviceTimeZone() ? <Text style={styles.help}>Times in {draft.timezone.replaceAll('_', ' ')}.</Text> : null}
              <TextAction label="Date to decide" onPress={() => { ownedImportSchedule.current = true; setDraft(clearPlanDate); setScheduleOpen(false); }} />
            </> : <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}><Text style={styles.rowLabel}>Date to decide</Text><Text style={styles.help}>A good idea can come first.</Text></View>
              <TextAction label="Choose a day" onPress={() => update({ date: shiftPlanDate(planDateKey(new Date(), draft.timezone), 1), time: '17:00' })} />
            </View>}
          </Section>

          <Section title="where">
            <PlanPlacePicker name={draft.locationName} address={draft.locationAddress} disabled={busy} onBusyChange={setChoosingPlace} onChange={(locationName, locationAddress) => update({ locationName, locationAddress })} />
          </Section>

          <Section title="with">
            <Pressable accessibilityRole="button" accessibilityLabel="Who can see this plan" accessibilityState={{ expanded: audienceOpen }} onPress={() => { Keyboard.dismiss(); setAudienceOpen(!audienceOpen); }} style={styles.rowBetween}>
              <View style={styles.row}><Icon name={draft.visibility === 'invited' ? 'lock' : 'person.2'} size={20} color={colors.terracotta} /><Text style={styles.rowLabel}>{audienceLabel}</Text></View><Icon name="chevron.right" size={16} color={colors.taupe} />
            </Pressable>
            {draft.visibility === 'invited' && !audienceOpen ? <Text style={styles.help}>{connections.filter((row) => draft.invitedIds.includes(row.parent.id)).map((row) => row.parent.display_name).join(', ') || 'Choose the friends to invite.'}</Text> : null}
            {audienceOpen ? <>
              {AUDIENCES.map((audience) => <Pressable key={audience.value} accessibilityRole="radio" accessibilityLabel={audience.label} accessibilityState={{ selected: draft.visibility === audience.value }} onPress={() => { update({ visibility: audience.value }); if (audience.value !== 'invited') setAudienceOpen(false); }} style={styles.audience}>
                <Icon name={audience.icon} size={20} color={colors.terracotta} /><View style={{ flex: 1 }}><Text style={styles.rowLabel}>{audience.label}</Text><Text style={styles.help}>{audience.detail}</Text></View>{draft.visibility === audience.value ? <Icon name="check.circle" size={20} color={colors.terracotta} /> : null}
              </Pressable>)}
              {draft.visibility === 'invited' ? <>
                {loadingConnections ? <ActivityIndicator color={colors.terracotta} /> : connections.length ? <>
                  {connections.length > 5 ? <TextInput accessibilityLabel="Find a friend to invite" value={connectionSearch} onChangeText={setConnectionSearch} placeholder="Find a friend" style={styles.field} /> : null}
                  {visibleConnections.map((row) => <Pressable accessibilityRole="checkbox" accessibilityLabel={row.parent.display_name} accessibilityState={{ checked: draft.invitedIds.includes(row.parent.id) }} key={row.parent.id} onPress={() => toggleInvite(row.parent.id)} style={styles.audience}>
                    <AvatarCircle initials={row.parent.avatar_initials} tone={row.parent.avatar_color} imageUrl={row.parent.avatar_url} size={36} /><Text style={[styles.rowLabel, { flex: 1 }]}>{row.parent.display_name}</Text><Icon name={draft.invitedIds.includes(row.parent.id) ? 'check.circle' : 'plus.circle'} size={21} color={colors.terracotta} />
                  </Pressable>)}
                  {!visibleConnections.length ? <Text style={styles.help}>No friends match that name.</Text> : null}
                  <TextAction label="Done choosing friends" onPress={() => setAudienceOpen(false)} />
                </> : <Text style={styles.help}>Connect with a friend in You, then invite them here.</Text>}
              </> : null}
            </> : null}
            {loadError ? <><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><TextAction label="Retry loading connections" onPress={() => setLoadAttempt((value) => value + 1)} /></> : null}
          </Section>

          {detailsOpen ? <Section title="a few details">
            <TextInput accessibilityLabel="Plan details" editable={!busy} value={draft.description} onChangeText={(description) => update({ description })} maxLength={600} multiline placeholder="What should friends know or bring?" placeholderTextColor={colors.taupe} style={[styles.field, styles.multiline]} />
            {!importOpen ? <>
              <Text style={styles.help}>A signup page, invitation, or useful link · optional</Text>
              <TextInput accessibilityLabel="Supporting link" editable={!busy} value={draft.sourceUrl} onChangeText={changeUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://…" placeholderTextColor={colors.taupe} style={styles.field} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
              <Toggle label="Friends sign up separately" value={draft.planKind === 'signup'} onChange={(value) => update({ planKind: value ? 'signup' : 'gathering' })} />
              {draft.planKind === 'signup' ? <Text style={styles.help}>Friends sign up with the organizer, then let each other know.</Text> : null}
            </> : null}
            <TextAction label="hide extra details" onPress={() => setDetailsOpen(false)} />
          </Section> : <TextAction label="Add a few details" onPress={() => setDetailsOpen(true)} />}
        </View>
      </FormScrollView>
      <View style={styles.footer}>
        {error ? <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Text style={styles.footerNote}>{choosingPlace ? 'Choose a place or cancel the search to continue' : `${draft.date ? '' : 'Date to decide · '}${audienceLabel}${draft.planKind === 'signup' ? ' · Signup activity' : ''}`}</Text>
        <TerracottaButton label={saving ? 'saving…' : editing ? 'save changes →' : 'share plan →'} accessibilityLabel={editing ? 'Save changes' : 'Share plan'} onPress={save} disabled={choosingPlace || busy || Array.from(draft.name.trim()).length < 2 || Boolean(existingPlan && !createSeparatePlan)} fullWidth />
      </View>
    </KeyboardFrame>
  </SafeAreaView>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function TextAction({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { Keyboard.dismiss(); onPress(); }} style={styles.textAction}><Text style={[styles.actionText, disabled && { opacity: 0.5 }]}>{label}</Text></Pressable>;
}
function Toggle({ label, value, disabled = false, onChange }: { label: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.rowBetween}><Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text><Switch accessibilityLabel={label} disabled={disabled} value={value} onValueChange={(next) => { Keyboard.dismiss(); onChange(next); }} trackColor={{ true: colors.terracotta }} /></View>;
}
function defaultEndTime(time: string): string {
  const hours = Number(time.split(':')[0] || 9);
  return `${String((hours + 2) % 24).padStart(2, '0')}:${time.split(':')[1] || '00'}`;
}
const styles = {
  screen: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.serifRegular, fontSize: 29, color: colors.dark },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  intro: { gap: spacing.sm, paddingBottom: spacing.xs },
  sections: { gap: spacing.md },
  section: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.rule, borderWidth: 1 },
  sectionTitle: { fontFamily: fonts.serifRegular, fontSize: 26, lineHeight: 30, color: colors.dark },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.dark },
  field: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, fontFamily: fonts.sansSemi, fontSize: 14, color: colors.dark },
  nameField: { flex: 1, fontSize: 16, backgroundColor: colors.surface },
  multiline: { minHeight: 96, paddingTop: spacing.md, paddingBottom: spacing.md, textAlignVertical: 'top' },
  emojiButton: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  emojiOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  help: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid },
  textAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  actionText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta },
  scheduleOptions: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: spacing.sm },
  weekdays: { flexDirection: 'row', gap: spacing.xs },
  weekday: { flex: 1, minHeight: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  audience: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopColor: colors.rule, borderTopWidth: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.rule, backgroundColor: colors.cream },
  footerNote: { fontFamily: fonts.sans, fontSize: 11, color: colors.brownMid, textAlign: 'center' },
  error: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta },
} as const;
