import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { normalizeEmail, normalizePhoneE164 } from '@/lib/contact';
import { Icon, TerracottaButton, TwinkleSparkle } from '@/components/ui';
import type { InviteOutcome } from '@/types';

type Method = 'email' | 'phone';

const SUCCESS_COPY: Record<InviteOutcome, { title: string; body: string }> = {
  request_sent: {
    title: 'request sent',
    body: 'they’re already on dolorian — your request is waiting for them.',
  },
  already_connected: {
    title: 'already friends',
    body: 'you two are connected already. small village!',
  },
  invited: {
    title: 'invite saved',
    body: 'when they join, your request will be waiting in their inbox.',
  },
};

export default function InviteScreen() {
  const [method, setMethod] = useState<Method>('email');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null);

  const send = async () => {
    setError(null);

    if (method === 'email') {
      const email = normalizeEmail(value);
      if (!email) { setError('that email doesn’t look right'); return; }
      await submit({ email });
    } else {
      const phone = normalizePhoneE164(value);
      if (!phone) { setError('that phone number doesn’t look right'); return; }
      await submit({ phone });
    }
  };

  const submit = async (input: { email?: string; phone?: string }) => {
    setLoading(true);
    try {
      const result = await data.sendInvite(input);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setOutcome(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      {/* Close chrome */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 6 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.rule,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="x" size={18} color={colors.dark} weight={2} />
        </Pressable>
      </View>

      {outcome ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
          <TwinkleSparkle size={20} color={colors.amberLight} />
          <Text
            style={{
              fontFamily: fonts.serif, fontSize: 34, color: colors.dark,
              letterSpacing: -0.5, marginTop: 14, textAlign: 'center',
            }}
          >
            {SUCCESS_COPY[outcome].title}
          </Text>
          <Text
            style={{
              fontFamily: fonts.serif, fontSize: 16, color: colors.brownMid,
              lineHeight: 22, textAlign: 'center', marginTop: 10,
            }}
          >
            {SUCCESS_COPY[outcome].body}
          </Text>
          <View style={{ height: 28 }} />
          <TerracottaButton label="done" onPress={() => router.back()} />
          <Pressable
            onPress={() => { setOutcome(null); setValue(''); }}
            hitSlop={8}
            style={{ marginTop: 14 }}
          >
            <Text style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.taupe }}>
              invite someone else
            </Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 24 }}>
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: colors.brownMid, letterSpacing: 0.7, marginBottom: 4 }}>
              GROW YOUR VILLAGE
            </Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 36, color: colors.dark, letterSpacing: -0.6, lineHeight: 38, marginBottom: 8 }}>
              invite a parent
            </Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 16, color: colors.brownMid, lineHeight: 22, marginBottom: 28 }}>
              by email or phone — even if they haven’t joined yet. they’ll get a
              request the moment they do.
            </Text>

            {/* Method toggle */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.surface,
                borderWidth: 1, borderColor: colors.rule,
                borderRadius: 22, padding: 4, marginBottom: 22,
              }}
            >
              {(['email', 'phone'] as Method[]).map((m) => {
                const active = method === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => { setMethod(m); setError(null); }}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 18,
                      backgroundColor: active ? colors.terracotta : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansExtra, fontSize: 13.5,
                        color: active ? colors.white : colors.taupe,
                      }}
                    >
                      {m === 'email' ? 'Email' : 'Phone'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              key={method}
              value={value}
              onChangeText={setValue}
              placeholder={method === 'email' ? 'their email address' : 'their phone number'}
              placeholderTextColor={colors.taupe}
              keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={{
                fontFamily: fonts.sansBold, fontSize: 16, color: colors.dark,
                borderBottomWidth: 1.5, borderBottomColor: colors.rule, paddingVertical: 10,
              }}
            />

            {error ? (
              <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta, marginTop: 14 }}>
                {error}
              </Text>
            ) : null}

            {loading ? (
              <ActivityIndicator color={colors.terracotta} style={{ marginTop: 28 }} />
            ) : (
              <TerracottaButton
                label="send invite →"
                onPress={send}
                fullWidth
                style={{ marginTop: 28 }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
