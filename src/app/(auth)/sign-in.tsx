import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, fonts, radii } from '@/lib/constants';
import {
  REVIEW_EMAIL,
  accountDestination,
  friendlyAuthError,
  normalizeEmail,
  parentProfileExists,
  requestEmailCode,
  signInWithApple,
  validateEmail,
  verifyEmailCode,
} from '@/lib/auth-flow';
import { TerracottaButton, TwinkleSparkle, Squiggle } from '@/components/ui';

type Step = 'email' | 'code';
const RESEND_SECONDS = 45;

export default function SignInScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendRemaining, setResendRemaining] = useState(0);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isReviewAccount = normalizedEmail === REVIEW_EMAIL;

  useEffect(() => {
    if (resendRemaining <= 0) return;
    const timer = setInterval(() => setResendRemaining((current) => Math.max(0, current - 1)), 1_000);
    return () => clearInterval(timer);
  }, [resendRemaining]);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const continueWithApple = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInWithApple();
      const hasProfile = await parentProfileExists(user.id);
      router.replace(accountDestination(hasProfile, invite) as never);
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause
        ? String((cause as { code?: unknown }).code)
        : '';
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError(friendlyAuthError(cause, 'Apple could not finish signing you in.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    const validation = validateEmail(email);
    if (validation) { setError(validation); return; }
    setError(null);
    setLoading(true);
    try {
      if (!isReviewAccount) {
        const sentTo = await requestEmailCode(email);
        setEmail(sentTo);
        setResendRemaining(RESEND_SECONDS);
      }
      setCode('');
      setStep('code');
    } catch (cause) {
      setError(friendlyAuthError(cause, 'Village could not send a code.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await verifyEmailCode(email, code);
      const hasProfile = await parentProfileExists(user.id);
      router.replace(accountDestination(hasProfile, invite) as never);
    } catch (cause) {
      setError(friendlyAuthError(cause, 'Village could not finish signing you in.'));
    } finally {
      setLoading(false);
    }
  };

  const editEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 34, justifyContent: 'center' }}
        >
          <View style={{ gap: 34 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
                <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: colors.brownMid, letterSpacing: 0.7 }}>
                  WELCOME TO
                </Text>
                <TwinkleSparkle size={10} color={colors.amberLight} />
              </View>
              <Text style={{ fontFamily: fonts.serif, fontSize: 48, color: colors.dark, letterSpacing: -0.8, lineHeight: 50 }}>
                village
              </Text>
              <View style={{ paddingTop: 6 }}><Squiggle width={70} color={colors.terracotta} /></View>
              <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: colors.brownMid, paddingTop: 14, lineHeight: 25 }}>
                {step === 'email'
                  ? 'the easy way to find your people and make a plan.'
                  : isReviewAccount
                    ? 'enter the App Review password.'
                    : `we sent a one-time code to ${normalizedEmail}.`}
              </Text>
            </View>

            {step === 'email' ? (
              <View style={styles.card}>
                {appleAvailable ? (
                  <>
                    <View pointerEvents={loading ? 'none' : 'auto'} style={{ opacity: loading ? 0.55 : 1 }}>
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={radii.md}
                        style={{ width: '100%', height: 54 }}
                        onPress={continueWithApple}
                      />
                    </View>
                    <View style={styles.dividerRow}>
                      <View style={styles.divider} />
                      <Text style={styles.dividerLabel}>OR USE EMAIL</Text>
                      <View style={styles.divider} />
                    </View>
                  </>
                ) : null}
                <View style={{ gap: 6 }}>
                  <Text style={styles.eyebrow}>EMAIL ADDRESS</Text>
                  <TextInput
                    value={email}
                    onChangeText={(value) => { setEmail(value); if (error) setError(null); }}
                    accessibilityLabel="Email address"
                    placeholder="you@example.com"
                    placeholderTextColor={colors.taupe}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={sendCode}
                    style={styles.input}
                  />
                </View>
                <Text style={styles.helper}>No password needed. A one-time code creates your Village account or signs you back in.</Text>
                {error ? <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                {loading ? <ActivityIndicator color={colors.terracotta} style={{ height: 58 }} /> : (
                  <TerracottaButton label="continue with email →" onPress={sendCode} disabled={!email.trim()} fullWidth />
                )}
              </View>
            ) : (
              <View style={styles.card}>
                <View style={{ gap: 6 }}>
                  <Text style={styles.eyebrow}>{isReviewAccount ? 'REVIEW PASSWORD' : 'ONE-TIME CODE'}</Text>
                  <TextInput
                    value={code}
                    onChangeText={(value) => { setCode(value); if (error) setError(null); }}
                    accessibilityLabel={isReviewAccount ? 'Review password' : 'One-time code'}
                    placeholder={isReviewAccount ? 'enter password' : '8-digit code'}
                    placeholderTextColor={colors.taupe}
                    keyboardType={isReviewAccount ? 'default' : 'number-pad'}
                    autoComplete={isReviewAccount ? 'password' : 'one-time-code'}
                    textContentType={isReviewAccount ? 'password' : 'oneTimeCode'}
                    secureTextEntry={isReviewAccount}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={isReviewAccount ? undefined : 8}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={verifyCode}
                    style={[styles.input, !isReviewAccount && { fontFamily: fonts.monoBold, fontSize: 22, letterSpacing: 3 }]}
                  />
                </View>
                {!isReviewAccount ? <Text style={styles.helper}>Codes expire for your security. You can paste it directly from the email.</Text> : null}
                {error ? <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                {loading ? <ActivityIndicator color={colors.terracotta} style={{ height: 58 }} /> : (
                  <TerracottaButton label={isReviewAccount ? 'sign in →' : 'finish signing in →'} onPress={verifyCode} disabled={!code} fullWidth />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Pressable onPress={editEmail} hitSlop={8}>
                    <Text style={styles.textButton}>change email</Text>
                  </Pressable>
                  {!isReviewAccount ? (
                    <Pressable disabled={resendRemaining > 0 || loading} onPress={sendCode} hitSlop={8}>
                      <Text style={[styles.textButton, resendRemaining > 0 && { color: colors.taupe }]}>
                        {resendRemaining > 0 ? `resend in ${resendRemaining}s` : 'resend code'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}

            <Text style={{ fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, textAlign: 'center', color: colors.taupe }}>
              Apple or your email is used only to secure your Village account.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  card: { padding: 18, gap: 15, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.surface, borderCurve: 'continuous' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.7, color: colors.brownMid } as const,
  input: { minHeight: 54, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.rule, backgroundColor: colors.cream, fontFamily: fonts.sansBold, fontSize: 16, color: colors.dark, borderCurve: 'continuous' } as const,
  helper: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.taupe } as const,
  error: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
  textButton: { fontFamily: fonts.sansExtra, fontSize: 11.5, color: colors.terracotta, paddingVertical: 4 } as const,
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 1 } as const,
  divider: { flex: 1, height: 1, backgroundColor: colors.rule } as const,
  dividerLabel: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.7, color: colors.taupe } as const,
};
