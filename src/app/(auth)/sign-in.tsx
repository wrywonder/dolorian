import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/constants';
import { TerracottaButton } from '@/components/ui';
import { TwinkleSparkle } from '@/components/ui';
import { Squiggle } from '@/components/ui';

type Step = 'email' | 'otp';

// Apple's beta reviewers can't receive OTP emails, so this one known
// account signs in with its password typed in place of the code. Only
// the email ships in the binary — the password lives in Supabase and
// App Store Connect's sign-in info.
const REVIEW_EMAIL = 'appreview@dolorian.app';

export default function SignInScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReviewAccount = email.trim().toLowerCase() === REVIEW_EMAIL;

  const sendOtp = async () => {
    setError(null);
    if (isReviewAccount) { setStep('otp'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('otp');
  };

  const verifyOtp = async () => {
    setError(null);
    setLoading(true);
    const { data, error: err } = isReviewAccount
      ? await supabase.auth.signInWithPassword({
          email: REVIEW_EMAIL,
          password: otp.trim(),
        })
      : await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: 'email',
        });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (!data.user) { setError('sign in failed — try again'); return; }

    // Check if this user already has a parent profile
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (parent) {
      router.replace((invite ? `/invite/${invite}` : '/(tabs)/buzz') as never);
    } else {
      router.replace(invite
        ? { pathname: '/(auth)/onboard', params: { invite } } as never
        : '/(auth)/onboard');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>
          {/* Header */}
          <View style={{ marginBottom: 48 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: colors.brownMid, letterSpacing: 0.7 }}>
                DOLORES COOL KIDS CLUB
              </Text>
              <TwinkleSparkle size={10} color={colors.amberLight} />
            </View>
            <Text style={{ fontFamily: fonts.serif, fontSize: 42, color: colors.dark, letterSpacing: -0.8, lineHeight: 44 }}>
              village
            </Text>
            <View style={{ marginTop: 6 }}>
              <Squiggle width={70} color={colors.terracotta} />
            </View>
            <Text style={{ fontFamily: fonts.serif, fontSize: 16, color: colors.brownMid, marginTop: 12, lineHeight: 22 }}>
              {step === 'email'
                ? 'your village is waiting.'
                : `check ${email} for your login code`}
            </Text>
          </View>

          {/* Input */}
          {step === 'email' ? (
            <View style={{ gap: 12 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email address"
                placeholderTextColor={colors.taupe}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 16,
                  color: colors.dark,
                  borderBottomWidth: 1.5,
                  borderBottomColor: colors.rule,
                  paddingVertical: 10,
                }}
              />
              {error ? (
                <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta }}>
                  {error}
                </Text>
              ) : null}
              {loading ? (
                <ActivityIndicator color={colors.terracotta} />
              ) : (
                <TerracottaButton label="send login code →" onPress={sendOtp} style={{ marginTop: 8 }} />
              )}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="paste code from email"
                placeholderTextColor={colors.taupe}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={{
                  fontFamily: fonts.monoBold,
                  fontSize: 16,
                  color: colors.dark,
                  letterSpacing: 1,
                  borderBottomWidth: 1.5,
                  borderBottomColor: colors.rule,
                  paddingVertical: 10,
                }}
              />
              {error ? (
                <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta }}>
                  {error}
                </Text>
              ) : null}
              {loading ? (
                <ActivityIndicator color={colors.terracotta} />
              ) : (
                <>
                  <TerracottaButton label="let me in →" onPress={verifyOtp} style={{ marginTop: 8 }} />
                  <Text
                    onPress={() => setStep('email')}
                    style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.taupe, textAlign: 'center', paddingTop: 8 }}
                  >
                    wrong email? go back
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
