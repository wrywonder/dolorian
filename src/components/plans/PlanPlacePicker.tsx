import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Icon } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/lib/constants';
import { createLatestRequest } from '@/lib/latest-request';
import { getPlaceDetails, searchPlaces, type PlaceSuggestion } from '@/lib/place-search';
import { readableError } from '@/lib/error-message';

type Props = { name: string; address: string; disabled: boolean; onChange: (name: string, address: string) => void; onBusyChange: (busy: boolean) => void };

export function PlanPlacePicker({ name, address, disabled, onChange, onBusyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [requests] = useState(createLatestRequest);
  const session = useRef('');
  const abort = useRef<AbortController | null>(null);
  const cancel = () => { requests.invalidate(); abort.current?.abort(); };

  useEffect(() => {
    if (!open || query.trim().length < 2 || disabled) { setSuggestions([]); setLoading(false); return; }
    const current = requests.begin();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchPlaces(query.trim(), session.current, controller.signal)
        .then((rows) => { if (current()) setSuggestions(rows); })
        .catch((cause) => { if (current()) setError(readableError(cause, 'Could not search places.')); })
        .finally(() => { if (current()) setLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); requests.invalidate(); controller.abort(); };
  }, [query, open, attempt, disabled, requests]);
  useEffect(() => () => { requests.invalidate(); abort.current?.abort(); }, [requests]);

  const choose = async (suggestion: PlaceSuggestion) => {
    if (selecting) return;
    cancel();
    const current = requests.begin();
    const controller = new AbortController();
    abort.current = controller;
    setSelecting(true);
    onBusyChange(true);
    setError(null);
    try {
      const place = await getPlaceDetails(suggestion.id, session.current, controller.signal);
      if (!current()) return;
      onChange(place.name, place.address);
      setOpen(false);
      setManual(false);
      Keyboard.dismiss();
    } catch (cause) {
      if (current()) setError(readableError(cause, 'Could not load this place.'));
    } finally {
      // The details call terminates a Google search session, including failures.
      session.current = Crypto.randomUUID();
      if (current()) { setSelecting(false); onBusyChange(false); }
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>PLACE · OPTIONAL</Text>
      {!open ? <Pressable accessibilityRole="button" accessibilityLabel={name ? `Change place, ${name}` : 'Find a place'} disabled={disabled} onPress={() => {
        session.current = Crypto.randomUUID(); setQuery(''); setError(null); setOpen(true);
      }} style={styles.field}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name={name ? 'map.pin' : 'search'} size={18} color={colors.terracotta} />
          <Text style={{ flex: 1, fontFamily: fonts.sansBold, fontSize: 14, color: name ? colors.dark : colors.terracotta }}>{name || 'Find a park, café, or address'}</Text>
        </View>
      </Pressable> : <View style={styles.results}>
        <TextInput autoFocus accessibilityLabel="Search plan places" value={query} maxLength={200} editable={!disabled && !selecting} placeholder="Place name + city" placeholderTextColor={colors.taupe} autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} onChangeText={(value) => { cancel(); setSuggestions([]); setQuery(value); }} style={styles.field} />
        <Text style={styles.help}>Add the city to find the right spot.</Text>
        {loading || selecting ? <ActivityIndicator accessibilityLabel={selecting ? 'Loading place address' : 'Searching places'} color={colors.terracotta} /> : null}
        {!loading && !error && query.trim().length >= 2 && suggestions.length === 0 ? <Text style={styles.help}>No matches yet. Add the city, or enter the place yourself.</Text> : null}
        {error ? <View><Text accessibilityRole="alert" style={styles.help}>{error}</Text><Pressable accessibilityRole="button" disabled={selecting} onPress={() => setAttempt((n) => n + 1)} style={styles.action}><Text style={styles.actionText}>try again</Text></Pressable></View> : null}
        {!loading ? suggestions.map((place) => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`Choose ${place.name}, ${place.address}`} disabled={selecting || disabled} onPress={() => void choose(place)} style={styles.suggestion}>
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.dark }}>{place.name}</Text><Text style={styles.help}>{place.address}</Text>
        </Pressable>) : null}
        {/* Compact attribution follows Google's text-attribution specification. */}
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: '#5E5E5E', textAlign: 'right' }}>Google Maps</Text>
        <Pressable accessibilityRole="button" disabled={selecting} onPress={() => { cancel(); setOpen(false); setManual(true); Keyboard.dismiss(); }} style={styles.action}><Text style={styles.actionText}>enter the place myself</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={selecting} onPress={() => { cancel(); setOpen(false); Keyboard.dismiss(); }} style={styles.action}><Text style={styles.actionText}>cancel search</Text></Pressable>
      </View>}
      {!open ? <>
        {manual ? <TextInput accessibilityLabel="Place name" editable={!disabled} value={name} onChangeText={(value) => onChange(value, address)} maxLength={200} placeholder="Our house, a favorite park…" placeholderTextColor={colors.taupe} style={styles.field} /> : null}
        <TextInput accessibilityLabel="Address or meetup note" editable={!disabled} value={address} onChangeText={(value) => onChange(name, value)} maxLength={400} placeholder="Address or meetup note · optional" placeholderTextColor={colors.taupe} style={styles.field} />
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setManual((value) => !value)} style={styles.action}><Text style={styles.actionText}>{manual ? 'hide manual name field' : 'or enter the place myself'}</Text></Pressable>
      </> : null}
    </View>
  );
}
const styles = {
  label: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.brownMid },
  field: { minHeight: 48, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderColor: colors.rule, borderWidth: 1, color: colors.dark, fontFamily: fonts.sansSemi, fontSize: 14 },
  help: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid, paddingTop: spacing.xs },
  results: { padding: spacing.sm, borderRadius: radii.lg, borderColor: colors.rule, borderWidth: 1, backgroundColor: colors.surface, gap: spacing.sm },
  suggestion: { minHeight: 56, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderBottomColor: colors.rule, borderBottomWidth: 1 },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta },
} as const;
