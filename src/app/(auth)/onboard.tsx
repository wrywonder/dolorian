import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { data } from '@/lib/data';
import { normalizePhoneE164 } from '@/lib/contact';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { AvatarCircle, TerracottaButton } from '@/components/ui';

const TONES: AvatarTone[] = ['peach', 'golden', 'sage', 'mauve', 'slate', 'rose', 'butter'];

export default function OnboardScreen() {
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [tone, setTone] = useState<AvatarTone>('peach');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const save = async () => {
    if (!displayName.trim()) { setError('add your name first'); return; }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('session expired — please sign in again'); setLoading(false); return; }

    // Phone is optional, but if present it must be a plausible number — it's a
    // contact handle others can invite us by, so a bad value is worth catching.
    const trimmedPhone = phone.trim();
    const phoneE164 = trimmedPhone ? normalizePhoneE164(trimmedPhone) : null;
    if (trimmedPhone && !phoneE164) {
      setError('that phone number doesn’t look right'); setLoading(false); return;
    }

    const { error: err } = await supabase.from('parents').insert({
      auth_user_id: user.id,
      display_name: displayName.trim(),
      email: user.email?.toLowerCase() ?? null,
      neighborhood: neighborhood.trim() || null,
      phone_e164: phoneE164,
      avatar_color: tone,
      avatar_initials: initials || '?',
    });

    if (err) {
      setLoading(false);
      // A unique-violation on phone means someone already claimed it.
      setError(err.code === '23505'
        ? 'that phone number is already on dolorian'
        : err.message);
      return;
    }

    // Turn any invites that were addressed to our email/phone into pending
    // requests so they're waiting in the inbox the moment we land.
    await data.resolveMyInvites().catch(() => {});

    setLoading(false);
    router.replace('/(tabs)/buzz');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: colors.brownMid, letterSpacing: 0.7, marginBottom: 4 }}>
            ONE LAST THING
          </Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 36, color: colors.dark, letterSpacing: -0.6, lineHeight: 38, marginBottom: 32 }}>
            tell us about yourself
          </Text>

          {/* Avatar preview */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <AvatarCircle initials={initials || '?'} tone={tone} size={80} />
          </View>

          {/* Tone picker */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
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
            <View>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.taupe, letterSpacing: 0.6, marginBottom: 6 }}>
                YOUR NAME
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Drew Rowny"
                placeholderTextColor={colors.taupe}
                autoFocus
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 16,
                  color: colors.dark,
                  borderBottomWidth: 1.5,
                  borderBottomColor: colors.rule,
                  paddingVertical: 8,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.taupe, letterSpacing: 0.6, marginBottom: 6 }}>
                NEIGHBORHOOD
              </Text>
              <TextInput
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="e.g. North Berkeley"
                placeholderTextColor={colors.taupe}
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 16,
                  color: colors.dark,
                  borderBottomWidth: 1.5,
                  borderBottomColor: colors.rule,
                  paddingVertical: 8,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.taupe, letterSpacing: 0.6, marginBottom: 6 }}>
                PHONE <Text style={{ color: colors.taupe }}>(optional)</Text>
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="so friends can find you"
                placeholderTextColor={colors.taupe}
                keyboardType="phone-pad"
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 16,
                  color: colors.dark,
                  borderBottomWidth: 1.5,
                  borderBottomColor: colors.rule,
                  paddingVertical: 8,
                }}
              />
            </View>
          </View>

          {error ? (
            <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta, marginTop: 16 }}>
              {error}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginTop: 28 }} />
          ) : (
            <TerracottaButton label="I'm in →" onPress={save} style={{ marginTop: 28 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
