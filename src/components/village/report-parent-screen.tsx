import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ReportReason, UUID } from '@/types';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'spam', label: 'Spam or unwanted requests' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'privacy', label: 'Privacy concern' },
  { key: 'unsafe_behavior', label: 'Unsafe behavior' },
  { key: 'other', label: 'Something else' },
];

export function ReportParentScreen({ parentId }: { parentId: UUID }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setSaving(true);
    setError(null);
    try {
      await data.submitParentReport(parentId, reason, details);
      Alert.alert('Report received', 'Thank you. The report is private and has been added to the safety review queue.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (cause) {
      setError(readableError(cause, 'Could not submit this report.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton}><View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View></Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>report a concern</Text><View style={{ width: 40 }} />
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 18 }}>
        <View><Text style={styles.eyebrow}>PRIVATE SAFETY REPORT</Text><Text style={{ fontFamily: fonts.serifRegular, fontSize: 34, lineHeight: 37, color: colors.dark, paddingTop: 4 }}>what should we know?</Text><Text style={styles.help}>The other parent won’t be told who submitted this report.</Text></View>
        <View style={styles.card}>{REASONS.map((item) => <Pressable key={item.key} onPress={() => setReason(item.key)} style={styles.row}><View style={[styles.radio, reason === item.key && { borderColor: colors.terracotta, backgroundColor: colors.terracotta }]}>{reason === item.key ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white }} /> : null}</View><Text style={styles.rowLabel}>{item.label}</Text></Pressable>)}</View>
        <View><Text style={styles.eyebrow}>DETAILS</Text><TextInput value={details} onChangeText={setDetails} multiline maxLength={2000} placeholder="Add anything that will help us understand what happened." placeholderTextColor={colors.taupe} style={styles.details} /><Text style={[styles.help, { textAlign: 'right' }]}>{details.length}/2000</Text></View>
        {error ? <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: colors.terracotta }}>{error}</Text> : null}
        <TerracottaButton label={saving ? 'submitting…' : 'submit private report →'} onPress={submit} disabled={!reason || saving} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  help: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.taupe, paddingTop: 8 } as const,
  card: { overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  rowLabel: { fontFamily: fonts.sansSemi, fontSize: 13.5, color: colors.dark } as const,
  details: { minHeight: 132, marginTop: 8, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, fontFamily: fonts.sansSemi, fontSize: 13.5, lineHeight: 20, color: colors.dark, textAlignVertical: 'top' } as const,
};
