import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ConnectionView, PlanInput, PlanLinkPreview, PlanVisibility, UUID } from '@/types';

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
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
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
      setSourceUrl(preview.url);
      if (preview.title) setName(preview.title);
      if (preview.description) setDescription(preview.description);
      if (preview.imageUrl) setCoverImageUrl(preview.imageUrl);
      if (preview.emoji) setEmoji(preview.emoji);
      if (preview.locationName) setLocationName(preview.locationName);
      if (preview.locationAddress) setLocationAddress(preview.locationAddress);
      if (preview.startDate) setDate(preview.startDate);
      if (preview.startTime) setTime(preview.startTime);
      if (preview.endDate) setEndDate(preview.endDate);
      if (preview.endTime) setEndTime(preview.endTime);
      if (preview.allDay !== null) setAllDay(preview.allDay);
      setImportResult(preview);
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
          <Text style={styles.help}>Paste a camp, market, class, or event page. Village will read the listing and prefill whatever it can find. You review everything before publishing.</Text>
          <TextInput
            value={sourceUrl}
            onChangeText={(value) => { setSourceUrl(value); setImportResult(null); }}
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
                  {importResult.inference === 'ai' ? 'AI-assisted import' : 'Read from the listing'} · review below before publishing
                </Text>
              </View>
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
            <LabeledField label="START DATE" value={date} onChangeText={setDate} placeholder="2026-08-15" />
            {!allDay ? <LabeledField label="TIME" value={time} onChangeText={setTime} placeholder="09:00" compact /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LabeledField label="END DATE · OPTIONAL" value={endDate} onChangeText={setEndDate} placeholder="2026-08-15" />
            {!allDay && endDate ? <LabeledField label="TIME" value={endTime} onChangeText={setEndTime} placeholder="12:00" compact /> : null}
          </View>
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
        <TerracottaButton label={saving ? 'saving plan…' : editing ? 'save changes →' : 'publish plan →'} onPress={save} disabled={saving || !name.trim()} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function LabeledField({ label, compact, ...props }: { label: string; compact?: boolean; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={{ flex: compact ? 0 : 1, width: compact ? 104 : undefined, gap: 5 }}><Text style={styles.eyebrow}>{label}</Text><TextInput {...props} autoCapitalize="none" placeholderTextColor={colors.taupe} style={styles.field} /></View>;
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
  secondaryButton: { minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' } as const,
  secondaryText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
  importSuccess: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.sage, backgroundColor: colors.sageSoft } as const,
  importSuccessTitle: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.dark } as const,
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 } as const,
  rowLabel: { fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.dark } as const,
  audienceCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, backgroundColor: colors.cream } as const,
  audienceSelected: { borderColor: colors.terracotta, backgroundColor: '#FFF6EF' } as const,
  audienceIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' } as const,
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, backgroundColor: colors.cream } as const,
  error: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
};
