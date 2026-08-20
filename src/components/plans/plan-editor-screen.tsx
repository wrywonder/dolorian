import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ActivitySocialProof, ConnectionView, PlanInput, PlanLinkPreview, PlanVisibility, UUID } from '@/types';

const AUDIENCES: { value: PlanVisibility; label: string; detail: string; icon: 'sun' | 'person.2' | 'lock' }[] = [
  { value: 'public', label: 'Public', detail: 'Any signed-in Village parent can discover it.', icon: 'sun' },
  { value: 'connections', label: 'My village', detail: 'Every accepted connection can see it.', icon: 'person.2' },
  { value: 'invited', label: 'Invited only', detail: 'Only the connections you choose can see it.', icon: 'lock' },
];

export function PlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const initialStart = useMemo(() => nextFriendlyStart(), []);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<PlanLinkPreview | null>(null);
  const [existingPlan, setExistingPlan] = useState<ActivitySocialProof | null>(null);
  const [createSeparatePlan, setCreateSeparatePlan] = useState(false);
  const [myId, setMyId] = useState<UUID | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceKey, setSourceKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [date, setDate] = useState(formatDateInput(initialStart));
  const [time, setTime] = useState(formatTimeInput(initialStart));
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [visibility, setVisibility] = useState<PlanVisibility>('connections');
  const [invitedIds, setInvitedIds] = useState<Set<UUID>>(new Set());
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      data.getConnectionViews(),
      id ? data.getPlan(id) : Promise.resolve(null),
      id ? data.getPlanInviteeIds(id) : Promise.resolve([]),
      data.getCurrentUser(),
    ]).then(([rows, proof, invitees, me]) => {
      if (!active) return;
      setMyId(me.id);
      setConnections(rows.filter((row) => row.connection.status === 'connected'));
      setInvitedIds(new Set(invitees));
      if (proof) {
        const plan = proof.activity;
        if (plan.created_by !== me.id) {
          setError('Only the person who created this plan can edit it.');
          return;
        }
        setName(plan.name);
        setDescription(plan.description ?? '');
        setEmoji(plan.emoji ?? '✨');
        setSourceUrl(plan.external_url ?? '');
        setSourceKey(plan.external_source_key ?? '');
        setCoverImageUrl(plan.cover_image_url ?? '');
        setLocationName(plan.location_name ?? proof.venue?.name ?? '');
        setLocationAddress(plan.location_address ?? '');
        setVisibility(plan.visibility);
        setAllDay(plan.all_day);
        if (plan.starts_at) {
          const start = new Date(plan.starts_at);
          setDate(formatDateInput(start));
          setTime(formatTimeInput(start));
        }
        if (plan.ends_at) {
          const end = new Date(plan.ends_at);
          setEndDate(formatDateInput(end));
          setEndTime(formatTimeInput(end));
        }
      } else if (id) {
        setError('This plan is unavailable or you cannot edit it.');
      }
    }).catch((cause) => {
      if (active) setError(readableError(cause, 'Could not load the plan editor.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const importLink = async () => {
    if (!sourceUrl.trim()) { setError('Paste a public link first.'); return; }
    setImporting(true);
    setError(null);
    try {
      const preview = await data.importPlanLink(sourceUrl.trim());
      const match = await data.findExistingPlan(preview.sourceKey, preview.url, id);
      setSourceUrl(preview.url);
      setSourceKey(preview.sourceKey);
      if (preview.title) setName(preview.title);
      if (preview.description) setDescription(preview.description);
      if (preview.imageUrl) setCoverImageUrl(preview.imageUrl);
      if (preview.emoji) setEmoji(preview.emoji);
      if (preview.locationName) setLocationName(preview.locationName);
      if (preview.locationAddress) setLocationAddress(preview.locationAddress);
      if (preview.startDate) {
        setDate(preview.startDate);
        if (preview.startTime) setTime(preview.startTime);
        else if (preview.allDay !== true) setTime('');
      } else {
        setTime('');
        setEndDate('');
        setEndTime('');
        setAllDay(false);
      }
      if (preview.endDate) {
        setEndDate(preview.endDate);
        if (preview.endTime) setEndTime(preview.endTime);
        else if (preview.allDay !== true) setEndTime('');
      }
      if (preview.allDay !== null) setAllDay(preview.allDay);
      setImportResult(preview);
      setExistingPlan(match);
      setCreateSeparatePlan(false);
    } catch (cause) {
      setError(readableError(cause, 'Could not import that link. You can still add its details manually.'));
    } finally {
      setImporting(false);
    }
  };

  const toggleInvite = (parentId: UUID) => {
    setInvitedIds((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId); else next.add(parentId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (existingPlan && !createSeparatePlan) {
        throw new Error('This listing is already in Village. Open the existing plan to coordinate there, or choose to make a separate plan.');
      }
      const startsAt = parseLocalDateTime(date, time, allDay);
      const endsAt = endDate.trim()
        ? parseLocalDateTime(endDate, endTime || time, allDay)
        : null;
      if (visibility === 'invited' && invitedIds.size === 0) {
        throw new Error('Choose at least one connection for an invited-only plan.');
      }
      const input: PlanInput = {
        name: name.trim(),
        description: description.trim(),
        emoji: emoji.trim() || '✨',
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: allDay,
        visibility,
        invited_parent_ids: visibility === 'invited' ? [...invitedIds] : [],
        location_name: locationName.trim(),
        location_address: locationAddress.trim(),
        external_url: sourceUrl.trim(),
        external_source_key: sourceKey,
        cover_image_url: coverImageUrl.trim(),
      };
      const saved = id ? await data.updatePlan(id, input) : await data.createPlan(input);
      router.replace(`/plan/${saved.id}` as never);
    } catch (cause) {
      setError(readableError(cause, 'Could not save this plan.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.terracotta} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{editing ? 'EDIT PLAN' : 'A NEW ADVENTURE'}</Text>
          <Text style={styles.title}>{editing ? 'make a change' : 'add a plan'}</Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Section eyebrow="IMPORT" title="start with a link">
          <Text style={styles.help}>Have a camp, class, or event listing? Paste it here and Village will prefill the shared facts. Planning something informal, like a Sonoma house weekend? Skip the link and fill in the plan below.</Text>
          <TextInput
            value={sourceUrl}
            onChangeText={(value) => {
              setSourceUrl(value);
              setSourceKey('');
              setImportResult(null);
              setExistingPlan(null);
              setCreateSeparatePlan(false);
            }}
            onSubmitEditing={importLink}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://…"
            placeholderTextColor={colors.taupe}
            style={styles.field}
          />
          <SecondaryButton label={importing ? 'reading the page…' : 'prefill plan details'} loading={importing} onPress={importLink} />
          {importResult ? (
            <View style={styles.importSuccess}>
              <Icon name="check.circle" size={20} color={colors.sage} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.importSuccessTitle}>
                  Filled {importResult.importedFields.length} detail{importResult.importedFields.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.help}>
                  {importResult.inference === 'ai'
                    ? 'AI-assisted import'
                    : importResult.inference === 'provider'
                      ? 'Filled from the link'
                      : 'Read from the listing'} · review below before publishing
                </Text>
              </View>
            </View>
          ) : null}
          {importResult?.warnings.map((warning) => (
            <View key={warning} style={styles.importWarning}>
              <Icon name="info" size={18} color={colors.terracotta} />
              <Text selectable style={[styles.help, { flex: 1, color: colors.brownMid }]}>{warning}</Text>
            </View>
          ))}
          {existingPlan && !createSeparatePlan ? (
            <View style={styles.existingPlan}>
              <Text style={styles.eyebrow}>ALREADY IN VILLAGE</Text>
              <Text style={styles.existingTitle}>{existingPlan.activity.name}</Text>
              <Text style={styles.help}>
                {existingPlan.activity.created_by === myId ? 'You already added this listing.' : 'Someone you can see already added this listing.'}{' '}
                {participantCount(existingPlan)} {participantCount(existingPlan) === 1 ? 'family is' : 'families are'} coordinating there.
              </Text>
              <SecondaryButton label="open existing plan →" onPress={() => router.replace(`/plan/${existingPlan.activity.id}` as never)} />
              <Pressable onPress={() => setCreateSeparatePlan(true)} style={{ alignSelf: 'center', padding: 6 }}>
                <Text style={styles.separateText}>this is actually a separate plan</Text>
              </Pressable>
            </View>
          ) : null}
        </Section>

        <Section eyebrow="THE PLAN" title="what’s happening?">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput value={emoji} onChangeText={setEmoji} maxLength={4} accessibilityLabel="Plan emoji" style={[styles.field, { width: 58, textAlign: 'center', fontSize: 22, paddingHorizontal: 4 }]} />
            <TextInput value={name} onChangeText={setName} maxLength={140} placeholder="Saturday farmers market" placeholderTextColor={colors.taupe} style={[styles.field, { flex: 1 }]} />
          </View>
          <TextInput value={description} onChangeText={setDescription} maxLength={600} multiline placeholder="A few useful details for other parents…" placeholderTextColor={colors.taupe} style={[styles.field, styles.multiline]} />
          <TextInput value={locationName} onChangeText={setLocationName} placeholder="Place name" placeholderTextColor={colors.taupe} style={styles.field} />
          <TextInput value={locationAddress} onChangeText={setLocationAddress} placeholder="Address or meetup note" placeholderTextColor={colors.taupe} style={styles.field} />
        </Section>

        <Section eyebrow="WHEN" title="pick a day">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PickerField label="START DATE" mode="date" dateValue={date} timeValue={time} onChange={setDate} />
            {!allDay ? time ? (
              <PickerField label="TIME" mode="time" dateValue={date} timeValue={time} onChange={setTime} compact />
            ) : (
              <AddTimeButton label="ADD TIME" onPress={() => setTime('09:00')} />
            ) : null}
          </View>
          {endDate ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PickerField label="END DATE" mode="date" dateValue={endDate} timeValue={endTime || time} onChange={setEndDate} minimumDate={dateFromInputs(date, time)} />
                {!allDay ? endTime ? (
                  <PickerField label="TIME" mode="time" dateValue={endDate} timeValue={endTime} onChange={setEndTime} compact />
                ) : (
                  <AddTimeButton label="END TIME" onPress={() => setEndTime(defaultEndTime(time))} />
                ) : null}
              </View>
              <Pressable onPress={() => { setEndDate(''); setEndTime(''); }} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                <Text style={styles.separateText}>remove end date</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setEndDate(date); setEndTime(allDay ? '' : defaultEndTime(time)); }} style={styles.addEndButton}>
              <Icon name="plus.circle" size={18} color={colors.terracotta} />
              <Text style={styles.secondaryText}>add an end date or camp range</Text>
            </Pressable>
          )}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}><Text style={styles.rowLabel}>All-day plan</Text><Text style={styles.help}>Useful for camp weeks and day trips.</Text></View>
            <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: colors.terracotta }} />
          </View>
        </Section>

        <Section eyebrow="WHO CAN SEE IT" title="choose the audience">
          {AUDIENCES.map((audience) => {
            const selected = visibility === audience.value;
            return (
              <Pressable key={audience.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setVisibility(audience.value)} style={[styles.audienceCard, selected && styles.audienceSelected]}>
                <View style={[styles.audienceIcon, selected && { backgroundColor: colors.terracotta }]}><Icon name={audience.icon} size={19} color={selected ? colors.white : colors.terracotta} /></View>
                <View style={{ flex: 1 }}><Text style={styles.rowLabel}>{audience.label}</Text><Text style={styles.help}>{audience.detail}</Text></View>
                {selected ? <Icon name="check.circle" size={20} color={colors.terracotta} /> : null}
              </Pressable>
            );
          })}

          {visibility === 'invited' ? (
            <View style={{ gap: 8, paddingTop: 4 }}>
              <Text style={styles.eyebrow}>CHOOSE CONNECTIONS</Text>
              {connections.length ? connections.map((row) => {
                const selected = invitedIds.has(row.parent.id);
                return (
                  <Pressable key={row.parent.id} onPress={() => toggleInvite(row.parent.id)} style={[styles.connectionRow, selected && { borderColor: colors.terracotta, backgroundColor: '#FFF6EF' }]}>
                    <AvatarCircle initials={row.parent.avatar_initials} tone={row.parent.avatar_color} imageUrl={row.parent.avatar_url} size={38} />
                    <View style={{ flex: 1 }}><Text style={styles.rowLabel}>{row.parent.display_name}</Text><Text style={styles.help}>{row.parent.neighborhood ?? 'Village connection'}</Text></View>
                    <Icon name={selected ? 'check.circle' : 'plus.circle'} size={21} color={selected ? colors.terracotta : colors.taupe} />
                  </Pressable>
                );
              }) : <Text style={styles.help}>Add a connection in Your Village before creating an invited-only plan.</Text>}
            </View>
          ) : null}
        </Section>

        {error ? <Text selectable style={styles.error}>{error}</Text> : null}
        <TerracottaButton label={saving ? 'saving plan…' : editing ? 'save changes →' : 'publish plan →'} onPress={save} disabled={saving || !name.trim() || (!allDay && !time) || Boolean(existingPlan && !createSeparatePlan)} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function PickerField({ label, mode, dateValue, timeValue, onChange, compact, minimumDate }: {
  label: string;
  mode: 'date' | 'time';
  dateValue: string;
  timeValue: string;
  onChange: (value: string) => void;
  compact?: boolean;
  minimumDate?: Date;
}) {
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  const picker = (
    <DateTimePicker
      value={dateFromInputs(dateValue, timeValue)}
      mode={mode}
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      minimumDate={minimumDate}
      minuteInterval={5}
      onChange={(_, selected) => {
        if (Platform.OS === 'android') setAndroidPickerOpen(false);
        if (!selected) return;
        onChange(mode === 'date' ? formatDateInput(selected) : formatTimeInput(selected));
      }}
    />
  );

  return (
    <View style={{ flex: compact ? 0 : 1, minWidth: compact ? 112 : 0, gap: 5 }}>
      <Text style={styles.eyebrow}>{label}</Text>
      <View style={styles.pickerField}>
        {Platform.OS === 'ios' ? picker : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose ${label.toLowerCase()}`}
            onPress={() => setAndroidPickerOpen(true)}
            style={styles.androidPickerButton}
          >
            <Text style={styles.androidPickerValue}>{mode === 'date' ? dateValue : timeValue}</Text>
            <Icon name="chevron.right" size={15} color={colors.taupe} />
          </Pressable>
        )}
      </View>
      {Platform.OS === 'android' && androidPickerOpen ? picker : null}
    </View>
  );
}

function AddTimeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={{ width: 112, gap: 5 }}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Pressable onPress={onPress} style={styles.pickerField}>
        <Icon name="plus.circle" size={18} color={colors.terracotta} />
        <Text style={styles.secondaryText}>add</Text>
      </Pressable>
    </View>
  );
}

function SecondaryButton({ label, loading, onPress }: { label: string; loading?: boolean; onPress: () => void }) {
  return <Pressable disabled={loading} onPress={onPress} style={styles.secondaryButton}>{loading ? <ActivityIndicator size="small" color={colors.terracotta} /> : <Text style={styles.secondaryText}>{label}</Text>}</Pressable>;
}

function nextFriendlyStart(): Date {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next;
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dateFromInputs(dateValue: string, timeValue: string): Date {
  const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch) return nextFriendlyStart();
  return new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    timeMatch ? Number(timeMatch[1]) : 9,
    timeMatch ? Number(timeMatch[2]) : 0,
  );
}

function defaultEndTime(startTime: string): string {
  const match = startTime.match(/^(\d{2}):(\d{2})$/);
  if (!match) return '15:00';
  const minutes = (Number(match[1]) * 60 + Number(match[2]) + 180) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function participantCount(proof: ActivitySocialProof): number {
  const responses = proof.goingConnections.length
    + proof.interestedConnections.length
    + proof.outConnections.length
    + (proof.myState ? 1 : 0);
  // The creator is already coordinating even before they add an RSVP.
  return Math.max(1, responses);
}

function parseLocalDateTime(dateValue: string, timeValue: string, allDay: boolean): string {
  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) throw new Error('Use YYYY-MM-DD for plan dates.');
  const timeMatch = (allDay ? '00:00' : timeValue.trim()).match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) throw new Error('Use 24-hour HH:MM for plan times.');
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day || value.getHours() !== hour || value.getMinutes() !== minute) {
    throw new Error('Choose a valid date and time.');
  }
  return value.toISOString();
}

const styles = {
  loading: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' } as const,
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 } as const,
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  title: { fontFamily: fonts.serifRegular, fontSize: 30, lineHeight: 33, color: colors.dark } as const,
  content: { paddingHorizontal: 16, paddingBottom: 50, gap: 16 } as const,
  section: { padding: 16, gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.lg } as const,
  sectionTitle: { fontFamily: fonts.serifRegular, fontSize: 26, lineHeight: 29, color: colors.dark } as const,
  help: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.taupe } as const,
  field: { minHeight: 46, paddingHorizontal: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, fontFamily: fonts.sansSemi, fontSize: 13.5, color: colors.dark } as const,
  multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' } as const,
  pickerField: { minHeight: 46, paddingHorizontal: 9, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 } as const,
  androidPickerButton: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 } as const,
  androidPickerValue: { fontFamily: fonts.sansSemi, fontSize: 13.5, color: colors.dark } as const,
  addEndButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 } as const,
  secondaryButton: { minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' } as const,
  secondaryText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
  importSuccess: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.sage, backgroundColor: colors.sageSoft } as const,
  importSuccessTitle: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.dark } as const,
  importWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 11, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream } as const,
  existingPlan: { gap: 9, padding: 13, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.terracotta, backgroundColor: '#FFF6EF' } as const,
  existingTitle: { fontFamily: fonts.serifRegular, fontSize: 22, lineHeight: 25, color: colors.dark } as const,
  separateText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.taupe, textDecorationLine: 'underline' } as const,
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 } as const,
  rowLabel: { fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.dark } as const,
  audienceCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, backgroundColor: colors.cream } as const,
  audienceSelected: { borderColor: colors.terracotta, backgroundColor: '#FFF6EF' } as const,
  audienceIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' } as const,
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, backgroundColor: colors.cream } as const,
  error: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
};
