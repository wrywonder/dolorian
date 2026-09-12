import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '@/lib/constants';
import { Icon } from '@/components/ui';
import type { Venue } from '@/types';

type CheckInSheetProps = {
  open: boolean;
  venues: Venue[];
  initialVenue: Venue | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onShare: (venue: Venue) => void;
  onAddPlace: () => void;
};

export function CheckInSheet({ open, venues, initialVenue, busy, error, onClose, onShare, onAddPlace }: CheckInSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Venue | null>(null);
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(initialVenue);
    }
  }, [open, initialVenue]);
  const matches = useMemo(() => venues.filter((venue) => venue.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, venues]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
      <KeyboardFrame accessibilityViewIsModal style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close check-in" disabled={busy} onPress={onClose} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(45,36,27,0.35)' }} />
        <View style={{ maxHeight: '88%', backgroundColor: colors.cream, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
          <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontFamily: fonts.serif, fontSize: 30, color: colors.dark }}>where’s the fun?</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close check-in" disabled={busy} onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={20} color={colors.brownMid} />
            </Pressable>
          </View>
          <Text style={{ paddingHorizontal: spacing.lg, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.brownMid }}>Pick where you are. Your connections can see this visit for up to 2 hours, or until you stop it.</Text>
          <TextInput
            accessibilityLabel="Search places"
            placeholder="Find a park, playground, café…"
            placeholderTextColor={colors.taupe}
            value={query}
            onChangeText={setQuery}
            editable={!busy}
            autoCorrect={false}
            style={{ margin: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderColor: colors.rule, borderWidth: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.dark }}
          />
          <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            {matches.map((venue) => {
              const checked = selected?.id === venue.id;
              return (
                <Pressable key={venue.id} accessibilityRole="radio" accessibilityState={{ checked, disabled: busy }} accessibilityLabel={venue.name} disabled={busy} onPress={() => setSelected(venue)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, minHeight: 58, borderRadius: radii.md, borderWidth: 1, borderColor: checked ? colors.sage : colors.rule, backgroundColor: checked ? colors.sageSoft : colors.surface }}>
                  <Text style={{ fontSize: 23 }}>{venue.emoji ?? '📍'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.dark }}>{venue.name}</Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.brownMid, paddingTop: spacing.xs }}>{venue.venue_type}</Text>
                  </View>
                  {checked ? <Icon name="check.circle" size={22} color={colors.sage} /> : null}
                </Pressable>
              );
            })}
            {matches.length === 0 ? <Text style={{ paddingVertical: spacing.lg, fontFamily: fonts.sans, color: colors.brownMid }}>No matching places yet.</Text> : null}
            <Pressable accessibilityRole="button" disabled={busy} onPress={onAddPlace} style={{ minHeight: 48, justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.sansBold, color: colors.terracotta }}>+ add the place I’m at</Text>
            </Pressable>
          </ScrollView>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.rule }}>
            {error ? <Text accessibilityRole="alert" selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta, paddingBottom: spacing.sm }}>{error}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !selected || busy, busy }} disabled={!selected || busy} onPress={() => { if (selected) onShare(selected); }} style={{ minHeight: 52, borderRadius: radii.pill, backgroundColor: colors.terracotta, opacity: !selected || busy ? 0.55 : 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md }}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={{ fontFamily: fonts.sansExtra, color: colors.white, fontSize: 15 }}>share this visit →</Text>}
            </Pressable>
            <Text style={{ textAlign: 'center', paddingTop: spacing.sm, fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.brownMid }}>One visit. Your automatic sharing settings stay the same.</Text>
          </View>
        </View>
      </KeyboardFrame>
    </Modal>
  );
}
