import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarCircle, Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ConnectionInvitePreview } from '@/types';

export function InviteAcceptanceScreen({ reference, signedIn }: { reference: string; signedIn: boolean }) {
  const [preview, setPreview] = useState<ConnectionInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    data.previewConnectionInvite(reference)
      .then((result) => { if (active) setPreview(result); })
      .catch((cause) => { if (active) setError(readableError(cause, 'Could not open this invite.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reference]);

  const accept = async () => {
    if (!preview?.inviter) return;
    setAccepting(true);
    setError(null);
    try {
      await data.redeemConnectionInvite(reference);
      router.replace(`/profile/${preview.inviter.id}`);
    } catch (cause) {
      setError(readableError(cause, 'Could not accept this invitation.'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={{ padding: 16 }}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={10} style={styles.iconButton}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' }}>
        {loading ? <ActivityIndicator color={colors.terracotta} /> : preview?.found && preview.inviter ? (
          <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
            <View style={{ padding: 7, borderRadius: 60, backgroundColor: colors.surface }}>
              <AvatarCircle
                initials={preview.inviter.avatar_initials}
                tone={preview.inviter.avatar_color as AvatarTone}
                imageUrl={preview.inviter.avatar_url}
                size={94}
              />
            </View>
            <Text style={styles.eyebrow}>A PRIVATE INVITATION</Text>
            <Text style={{ fontFamily: fonts.serifRegular, fontSize: 38, lineHeight: 41, color: colors.dark, textAlign: 'center' }}>
              {preview.inviter.display_name.split(' ')[0]} invited you into their village
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.brownMid, textAlign: 'center' }}>
              {preview.inviter.neighborhood ? `${preview.inviter.neighborhood} · ` : ''}Connections are mutual, private, and always under your control.
            </Text>
            {!preview.active ? (
              <Text selectable style={styles.error}>This invite has expired or reached its limit.</Text>
            ) : signedIn ? (
              <TerracottaButton label={accepting ? 'joining…' : 'join their village →'} onPress={accept} disabled={accepting} fullWidth style={{ marginTop: 8 }} />
            ) : (
              <TerracottaButton
                label="sign in to accept →"
                onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { invite: reference } } as never)}
                fullWidth
                style={{ marginTop: 8 }}
              />
            )}
            {error ? <Text selectable style={styles.error}>{error}</Text> : null}
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Icon name="shield" size={40} color={colors.taupe} />
            <Text style={{ fontFamily: fonts.serifRegular, fontSize: 28, color: colors.dark }}>invite not found</Text>
            <Text selectable style={styles.error}>{error ?? 'Ask the sender for a fresh private invite.'}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = {
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.8, color: colors.taupe } as const,
  error: { fontFamily: fonts.sansSemi, fontSize: 12.5, lineHeight: 18, color: colors.terracotta, textAlign: 'center' } as const,
};
