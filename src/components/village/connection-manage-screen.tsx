import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FormScrollView as ScrollView } from '@/components/ui/FormScrollView';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ConnectionPreference, ContactExchange, Parent, UUID } from '@/types';

export function ConnectionManageScreen({ parentId }: { parentId: UUID }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [preference, setPreference] = useState<ConnectionPreference | null>(null);
  const [contact, setContact] = useState<ContactExchange | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      data.getProfile(parentId),
      data.getConnectionViews(),
      data.getContactExchange(parentId),
    ]).then(([profile, views, exchange]) => {
      if (!active) return;
      const view = views.find((item) => item.parent.id === parentId && item.connection.status === 'connected');
      if (!profile || !view) throw new Error('This connection is no longer available.');
      setParent(profile.parent);
      setPreference(view.preference);
      setContact(exchange);
    }).catch((cause) => {
      if (active) setError(readableError(cause, 'Could not load connection settings.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [parentId]);

  const save = async () => {
    if (!preference) return;
    setSaving(true);
    setError(null);
    try {
      await data.setConnectionPreferences(parentId, preference);
      router.back();
    } catch (cause) {
      setError(readableError(cause, 'Could not save connection settings.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePhoneShare = async (enabled: boolean) => {
    setContactBusy(true);
    setError(null);
    try {
      await data.setContactShare(parentId, enabled);
      setContact(await data.getContactExchange(parentId));
    } catch (cause) {
      setError(readableError(cause, 'Could not update contact sharing.'));
    } finally {
      setContactBusy(false);
    }
  };

  const remove = () => {
    if (!parent) return;
    Alert.alert(`Remove ${parent.display_name}?`, 'They will stop seeing your posts and IRL presence. You can reconnect later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove Connection', style: 'destructive', onPress: async () => {
        try { await data.removeConnection(parentId); router.replace('/village' as never); }
        catch (cause) { setError(readableError(cause, 'Could not remove this connection.')); }
      } },
    ]);
  };

  const block = () => {
    if (!parent) return;
    Alert.alert(`Block ${parent.display_name}?`, 'They won’t be able to find you, contact you, or see your activity. You can unblock them privately later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block Parent', style: 'destructive', onPress: async () => {
        try { await data.blockConnection(parentId); router.replace('/village?tab=blocked' as never); }
        catch (cause) { setError(readableError(cause, 'Could not block this parent.')); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardFrame>
        <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
            <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>connection settings</Text>
          <View style={{ width: 40 }} />
        </View>
        {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.terracotta} /></View> : parent && preference ? (
          <ScrollView keyboardDismissMode="on-drag" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 50, gap: 17 }}>
            <Pressable onPress={() => router.push(`/profile/${parentId}`)} style={{ alignItems: 'center', gap: 9, paddingVertical: 8 }}>
              <AvatarCircle initials={parent.avatar_initials} tone={parent.avatar_color} imageUrl={parent.avatar_url} size={82} />
              <Text style={{ fontFamily: fonts.serifRegular, fontSize: 29, color: colors.dark }}>{parent.display_name}</Text>
              <Text style={styles.secondary}>{parent.neighborhood ?? 'Village parent'}</Text>
            </Pressable>

            <Card title="connection preferences" eyebrow="JUST FOR YOU">
              <ToggleRow icon="star" label="Favorite connection" detail="Keeps them near the top of Your Village." value={preference.favorite} onValueChange={(favorite) => setPreference({ ...preference, favorite })} />
              <ToggleRow icon="bell" label="Mute their posts" detail="Stay connected without seeing their Buzz posts." value={preference.muted} onValueChange={(muted) => setPreference({ ...preference, muted })} />
              <ToggleRow icon="eye.slash" label="Share my IRL presence" detail="Turn off to hide your live hangout presence from this parent." value={preference.location_visible} onValueChange={(location_visible) => setPreference({ ...preference, location_visible })} />
              <View style={{ padding: 14 }}>
                <Text style={styles.rowLabel}>Private note</Text>
                <TextInput
                  value={preference.note ?? ''}
                  onChangeText={(note) => setPreference({ ...preference, note })}
                  placeholder="How you met, their kid’s favorite game…"
                  placeholderTextColor={colors.taupe}
                  multiline
                  maxLength={500}
                  style={styles.noteField}
                />
                <Text style={[styles.secondary, { textAlign: 'right' }]}>{preference.note?.length ?? 0}/500</Text>
              </View>
            </Card>

            <Card title="contact sharing" eyebrow="SEPARATE CONSENT">
              {contact?.my_phone_set ? (
                <ToggleRow icon="phone" label={`Share my number with ${parent.display_name.split(' ')[0]}`} detail="You can turn this off at any time." value={Boolean(contact.i_share)} disabled={contactBusy} onValueChange={togglePhoneShare} />
              ) : (
                <Pressable onPress={() => router.push('/settings')} style={styles.actionRow}>
                  <Icon name="phone" size={19} color={colors.terracotta} />
                  <View style={{ flex: 1 }}><Text style={styles.rowLabel}>Add your phone number</Text><Text style={styles.secondary}>Stored privately until you choose someone to share it with.</Text></View>
                  <Icon name="chevron.right" size={18} color={colors.taupe} />
                </Pressable>
              )}
              {contact?.their_phone ? (
                <View style={{ padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.rule }}>
                  <Text style={styles.rowLabel}>{parent.display_name.split(' ')[0]} shared</Text>
                  <Text selectable style={{ fontFamily: fonts.monoBold, fontSize: 18, color: colors.dark }}>{contact.their_phone}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <ContactButton label="call" onPress={() => Linking.openURL(`tel:${contact.their_phone}`)} />
                    <ContactButton label="message" onPress={() => Linking.openURL(`sms:${contact.their_phone}`)} />
                  </View>
                </View>
              ) : <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.taupe, padding: 14, borderTopWidth: 1, borderTopColor: colors.rule }}>{parent.display_name.split(' ')[0]} hasn’t shared a number with you.</Text>}
            </Card>

            {error ? <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>{error}</Text> : null}
            <TerracottaButton label={saving ? 'saving…' : 'save connection settings →'} onPress={save} disabled={saving} fullWidth />

            <Card title="safety" eyebrow="YOU’RE IN CONTROL">
              <Pressable onPress={() => router.push(`/report/${parentId}` as never)} style={styles.actionRow}><Icon name="shield" size={19} color={colors.terracotta} /><Text style={[styles.rowLabel, { flex: 1 }]}>Report a concern</Text><Icon name="chevron.right" size={18} color={colors.taupe} /></Pressable>
              <Pressable onPress={remove} style={styles.actionRow}><Icon name="x" size={19} color={colors.terracotta} /><Text style={[styles.rowLabel, { flex: 1, color: colors.terracotta }]}>Remove connection</Text></Pressable>
              <Pressable onPress={block} style={styles.actionRow}><Icon name="eye.slash" size={19} color={colors.terracotta} /><Text style={[styles.rowLabel, { flex: 1, color: colors.terracotta }]}>Block parent</Text></Pressable>
            </Card>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14 }}><Icon name="shield" size={38} color={colors.taupe} /><Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 19, color: colors.terracotta, textAlign: 'center' }}>{error ?? 'Connection not found.'}</Text></View>
        )}
      </KeyboardFrame>
    </SafeAreaView>
  );
}

function Card({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <View><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.cardTitle}>{title}</Text><View style={styles.card}>{children}</View></View>;
}

function ToggleRow({ icon, label, detail, value, onValueChange, disabled = false }: { icon: 'star' | 'bell' | 'eye.slash' | 'phone'; label: string; detail: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) {
  return <View style={styles.toggleRow}><Icon name={icon} size={19} color={colors.terracotta} /><View style={{ flex: 1 }}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.secondary}>{detail}</Text></View><Switch disabled={disabled} value={value} onValueChange={onValueChange} trackColor={{ false: colors.rule, true: colors.sage }} /></View>;
}

function ContactButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.contactButton}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 11, color: colors.terracotta }}>{label}</Text></Pressable>;
}

const styles = {
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe, paddingBottom: 2 } as const,
  secondary: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.taupe, paddingTop: 2 } as const,
  cardTitle: { fontFamily: fonts.serifRegular, fontSize: 25, color: colors.dark, paddingBottom: 8 } as const,
  card: { overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  toggleRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  rowLabel: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.dark } as const,
  noteField: { minHeight: 78, marginTop: 8, padding: 11, borderRadius: radii.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.rule, fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 18, color: colors.dark, textAlignVertical: 'top' } as const,
  actionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: colors.rule } as const,
  contactButton: { flex: 1, minHeight: 39, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' } as const,
};
