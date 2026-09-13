import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, spacing, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import { inviteNextStep } from '@/lib/invite-links';
import { createLatestRequest } from '@/lib/latest-request';
import type { ConnectionInvitePreview } from '@/types';

export function InviteAcceptanceScreen({ reference, signedIn }: { reference: string; signedIn: boolean }) {
  const [preview, setPreview] = useState<ConnectionInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests] = useState(createLatestRequest);
  const pending = useRef(false);

  const load = useCallback(async () => {
    if (pending.current) return;
    const isCurrent = requests.begin();
    setLoading(true);
    setAccepting(false);
    setPreview(null);
    setError(null);
    try {
      const result = await data.previewConnectionInvite(reference);
      if (!isCurrent()) return;
      setPreview(result);
      if (inviteNextStep(result, signedIn) === 'view-plan' && result.plan) {
        router.replace(`/plan/${result.plan.id}`);
      }
    } catch (cause) {
      if (isCurrent()) setError(readableError(cause, 'Could not open this invite. Please try again.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [reference, requests, signedIn]);
  useFocusEffect(useCallback(() => {
    void load();
    return () => { requests.invalidate(); pending.current = false; };
  }, [load, requests]));

  const accept = async () => {
    if (!preview?.inviter || pending.current) return;
    pending.current = true;
    const isCurrent = requests.begin();
    setAccepting(true);
    setError(null);
    try {
      await data.redeemConnectionInvite(reference);
      if (!isCurrent()) return;
      router.replace(preview.plan ? `/plan/${preview.plan.id}` : `/profile/${preview.inviter.id}`);
    } catch (cause) {
      if (isCurrent()) setError(readableError(cause, 'Could not accept this invitation. Please try again.'));
    } finally {
      if (isCurrent()) { pending.current = false; setAccepting(false); }
    }
  };

  const step = inviteNextStep(preview, signedIn);
  const firstName = preview?.inviter?.display_name.split(' ')[0] ?? 'your friend';
  const isPlan = Boolean(preview?.plan);
  const title = isPlan ? `${firstName} shared a plan with you`
    : step === 'own-invite' ? 'this is your Village link'
      : step === 'view-profile' ? `you’re already connected with ${firstName}`
        : `${firstName} invited you into their village`;
  const actionLabel = accepting ? 'connecting…'
    : step === 'sign-in' ? (isPlan ? 'sign in to see the plan →' : 'sign in to accept →')
      : step === 'onboard' ? 'finish your profile →'
        : step === 'view-plan' ? 'view plan →'
          : step === 'own-invite' ? 'share this invite →'
            : step === 'view-profile' ? 'view their profile →'
              : isPlan ? (preview?.already_connected ? 'accept & view plan →' : 'connect & view plan →')
                : `connect with ${firstName} →`;
  const act = () => {
    if (step === 'sign-in' || step === 'onboard') {
      router.push({ pathname: step === 'sign-in' ? '/(auth)/sign-in' : '/(auth)/onboard', params: { invite: reference } });
    } else if (step === 'view-plan' && preview?.plan) router.replace(`/plan/${preview.plan.id}`);
    else if (step === 'own-invite') router.replace('/add-to-village');
    else if (step === 'view-profile' && preview?.inviter) router.replace(`/profile/${preview.inviter.id}`);
    else if (step === 'accept') void accept();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={{ padding: spacing.lg }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={10} style={styles.iconButton}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={colors.terracotta} /> : step !== 'unavailable' && preview?.inviter ? (
          <View style={styles.invitation}>
            <AvatarCircle initials={preview.inviter.avatar_initials} tone={preview.inviter.avatar_color as AvatarTone} imageUrl={preview.inviter.avatar_url} size={94} />
            <Text style={styles.eyebrow}>{isPlan ? 'LET’S GET TOGETHER' : 'A PRIVATE INVITATION'}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.help}>
              {isPlan
                ? preview.already_connected
                  ? 'Accept this invitation to see the details and let them know if you can make it.'
                  : `Connect with ${firstName} to see the details and let them know if you can make it. You’ll also see each other’s plans and posts shared with connections.`
                : step === 'own-invite'
                  ? 'Share this link with parents you already know. You can revoke it whenever you want.'
                  : 'Connections are mutual, private, and always under your control.'}
            </Text>
            {step === 'expired' ? <Text style={styles.error}>This invitation is no longer active. Ask {firstName} for a fresh link.</Text> : <TerracottaButton label={actionLabel} onPress={act} disabled={accepting} fullWidth style={{ marginTop: spacing.sm }} />}
            {error ? <View style={styles.invitation}><Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text><TerracottaButton label="check invitation again" onPress={load} disabled={accepting} fullWidth /></View> : null}
          </View>
        ) : (
          <View style={styles.invitation}>
            <Icon name="shield" size={40} color={colors.taupe} />
            <Text style={styles.title}>{error ? 'let’s try that again' : 'invitation unavailable'}</Text>
            <Text selectable accessibilityRole={error ? 'alert' : undefined} style={styles.help}>{error ?? 'This link may have been removed. Ask the sender for a fresh invitation.'}</Text>
            <TerracottaButton label="try again" onPress={load} fullWidth />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxl, justifyContent: 'center', alignItems: 'center' } as const,
  invitation: { width: '100%', alignItems: 'center', gap: spacing.lg } as const,
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.8, color: colors.taupe } as const,
  title: { fontFamily: fonts.serifRegular, fontSize: 38, lineHeight: 41, color: colors.dark, textAlign: 'center' } as const,
  help: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.brownMid, textAlign: 'center' } as const,
  error: { fontFamily: fonts.sansSemi, fontSize: 12.5, lineHeight: 18, color: colors.terracotta, textAlign: 'center' } as const,
};
