import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ConnectionCircle, ConnectionView, UUID } from '@/types';

export function CircleEditorScreen({ circleId }: { circleId: UUID }) {
  const [circle, setCircle] = useState<ConnectionCircle | null>(null);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [selected, setSelected] = useState<Set<UUID>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([data.getConnectionCircles(), data.getConnectionViews()])
      .then(([circles, views]) => {
        if (!active) return;
        const found = circles.find((item) => item.id === circleId) ?? null;
        setCircle(found);
        setSelected(new Set(found?.memberIds ?? []));
        setConnections(views.filter((item) => item.connection.status === 'connected'));
      })
      .catch((cause) => { if (active) setError(readableError(cause, 'Could not load this circle.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [circleId]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return connections.filter((item) => !normalized
      || item.parent.display_name.toLowerCase().includes(normalized)
      || item.parent.neighborhood?.toLowerCase().includes(normalized));
  }, [connections, query]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await data.setConnectionCircleMembers(circleId, [...selected]);
      router.back();
    } catch (cause) {
      setError(readableError(cause, 'Could not save this circle.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!circle) return;
    Alert.alert(`Delete ${circle.name}?`, 'The people in it will stay connected to you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Circle', style: 'destructive', onPress: async () => {
        try { await data.deleteConnectionCircle(circleId); router.back(); }
        catch (cause) { setError(readableError(cause, 'Could not delete this circle.')); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark, textAlign: 'center' }}>{circle ? `${circle.emoji} ${circle.name}` : 'circle'}</Text>
        <Pressable onPress={remove} hitSlop={10} style={styles.iconButton}><Icon name="x" size={17} color={colors.terracotta} /></Pressable>
      </View>
      {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.terracotta} /></View> : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 50, gap: 16 }}>
          <View>
            <Text style={styles.eyebrow}>CHOOSE CONNECTIONS</Text>
            <Text style={{ fontFamily: fonts.serifRegular, fontSize: 31, color: colors.dark, paddingTop: 3 }}>who belongs in this circle?</Text>
          </View>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.taupe} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search your connections" placeholderTextColor={colors.taupe} style={{ flex: 1, fontFamily: fonts.sansSemi, fontSize: 14, color: colors.dark }} />
          </View>
          <View style={styles.card}>
            {visible.length ? visible.map((item) => {
              const checked = selected.has(item.parent.id);
              return (
                <Pressable key={item.parent.id} onPress={() => setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.delete(item.parent.id); else next.add(item.parent.id);
                  return next;
                })} style={styles.row}>
                  <AvatarCircle initials={item.parent.avatar_initials} tone={item.parent.avatar_color} imageUrl={item.parent.avatar_url} size={44} />
                  <View style={{ flex: 1 }}><Text style={styles.rowName}>{item.parent.display_name}</Text><Text style={styles.secondary}>{item.parent.neighborhood ?? 'Village parent'}</Text></View>
                  <View style={[styles.check, checked && { backgroundColor: colors.terracotta, borderColor: colors.terracotta }]}>
                    {checked ? <Icon name="check.circle" size={18} color={colors.white} /> : null}
                  </View>
                </Pressable>
              );
            }) : <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.taupe, padding: 16, textAlign: 'center' }}>No connections match.</Text>}
          </View>
          {error ? <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: colors.terracotta }}>{error}</Text> : null}
          <TerracottaButton label={saving ? 'saving…' : `save ${selected.size} member${selected.size === 1 ? '' : 's'} →`} onPress={save} disabled={saving} fullWidth />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = {
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 45, paddingHorizontal: 12, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  card: { overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  rowName: { fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.dark } as const,
  secondary: { fontFamily: fonts.sans, fontSize: 11, color: colors.taupe, paddingTop: 2 } as const,
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
};
