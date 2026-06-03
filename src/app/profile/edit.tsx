import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { normalizePhoneE164 } from '@/lib/contact';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import type { Parent } from '@/types';

const TONES: AvatarTone[] = ['peach', 'golden', 'sage', 'mauve', 'slate', 'rose', 'butter'];

export default function EditProfileScreen() {
  const [loaded, setLoaded] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [tone, setTone] = useState<AvatarTone>('peach');
  const [originalPhone, setOriginalPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    data.getCurrentUser().then((me: Parent) => {
      setDisplayName(me.display_name);
      setNeighborhood(me.neighborhood ?? '');
      setPhone(me.phone_e164 ?? '');
      setOriginalPhone(me.phone_e164 ?? null);
      setEmail(me.email);
      setTone(me.avatar_color);
      setLoaded(true);
    });
  }, []);

  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const save = async () => {
    if (!displayName.trim()) { setError('your name can’t be empty'); return; }

    const trimmedPhone = phone.trim();
    const phoneE164 = trimmedPhone ? normalizePhoneE164(trimmedPhone) : null;
    if (trimmedPhone && !phoneE164) {
      setError('that phone number doesn’t look right'); return;
    }

    setError(null);
    setSaving(true);
    try {
      await data.updateProfile({
        display_name: displayName.trim(),
        neighborhood: neighborhood.trim() || null,
        phone_e164: phoneE164,
        avatar_color: tone,
        avatar_initials: initials || '?',
      });

      // If they just added/changed a phone, any invites sent to that number
      // can now resolve into pending requests.
      if (phoneE164 && phoneE164 !== originalPhone) {
        await data.resolveMyInvites().catch(() => {});
      }

      router.back();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(err.code === '23505'
        ? 'that phone number is already on dolorian'
        : (err.message ?? 'couldn’t save changes'));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.terracotta} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Close chrome */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 6 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={18} color={colors.dark} weight={2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: colors.brownMid, letterSpacing: 0.7, marginBottom: 4 }}>
            YOUR PROFILE
          </Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 36, color: colors.dark, letterSpacing: -0.6, lineHeight: 38, marginBottom: 28 }}>
            edit details
          </Text>

          {/* Avatar preview */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <AvatarCircle initials={initials || '?'} tone={tone} size={80} />
          </View>

          {/* Tone picker */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 30 }}>
            {TONES.map((t) => (
              <AvatarCircle
                key={t}
                initials=""
                tone={t}
                size={32}
                onPress={() => setTone(t)}
                style={t === tone ? { borderWidth: 2.5, borderColor: colors.dark } : {}}
              />
            ))}
          </View>

          <View style={{ gap: 20 }}>
            <Field label="YOUR NAME">
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Drew Rowny"
                placeholderTextColor={colors.taupe}
                style={inputStyle}
              />
            </Field>

            <Field label="NEIGHBORHOOD">
              <TextInput
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="e.g. North Berkeley"
                placeholderTextColor={colors.taupe}
                style={inputStyle}
              />
            </Field>

            <Field label="PHONE">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="so friends can find you"
                placeholderTextColor={colors.taupe}
                keyboardType="phone-pad"
                style={inputStyle}
              />
            </Field>

            {/* Email is read-only — it's the login identity. */}
            <View>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.taupe, letterSpacing: 0.6, marginBottom: 6 }}>
                EMAIL
              </Text>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: colors.taupe, paddingVertical: 8 }}>
                {email ?? '—'}
              </Text>
            </View>
          </View>

          {error ? (
            <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta, marginTop: 16 }}>
              {error}
            </Text>
          ) : null}

          {saving ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginTop: 28 }} />
          ) : (
            <TerracottaButton label="save changes →" onPress={save} fullWidth style={{ marginTop: 28 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputStyle = {
  fontFamily: fonts.sansBold,
  fontSize: 16,
  color: colors.dark,
  borderBottomWidth: 1.5,
  borderBottomColor: colors.rule,
  paddingVertical: 8,
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.taupe, letterSpacing: 0.6, marginBottom: 6 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
