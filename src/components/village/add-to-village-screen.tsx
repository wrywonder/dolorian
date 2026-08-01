import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import type { ConnectionInvite } from '@/types';

export function AddToVillageScreen() {
  const [invite, setInvite] = useState<ConnectionInvite | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'share' | 'email' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const link = useMemo(() => invite ? Linking.createURL(`/invite/${invite.token}`) : null, [invite]);

  const ensureInvite = async (): Promise<{ invite: ConnectionInvite; link: string }> => {
    if (invite && link) return { invite, link };
    const created = await data.createConnectionInvite();
    const createdLink = Linking.createURL(`/invite/${created.token}`);
    setInvite(created);
    return { invite: created, link: createdLink };
  };

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      await ensureInvite();
    } catch (cause) {
      setError(readableError(cause, 'Could not create an invite.'));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    setError(null);
    try {
      const created = await ensureInvite();
      await Share.share({
        title: 'Join my Village',
        message: `Join my private parent village. Use code ${created.invite.code} or open ${created.link}`,
      });
    } catch (cause) {
      setError(readableError(cause, 'Could not share this invite.'));
    } finally {
      setBusy(null);
    }
  };

  const sendEmail = async () => {
    if (!email.trim()) { setError('Add an email address first.'); return; }
    setBusy('email');
    setError(null);
    try {
      const created = await ensureInvite();
      const subject = encodeURIComponent('Join my Village');
      const body = encodeURIComponent(`I’d love to add you to my private parent village.\n\nInvite code: ${created.invite.code}\n${created.link}\n\nThis invite expires in seven days.`);
      await Linking.openURL(`mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${body}`);
    } catch (cause) {
      setError(readableError(cause, 'Could not open your email app.'));
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    if (!code.trim()) return;
    setBusy('join');
    setError(null);
    try {
      const preview = await data.previewConnectionInvite(code);
      if (!preview.found || !preview.active || !preview.inviter) throw new Error('That invite is invalid or expired.');
      await data.redeemConnectionInvite(code);
      router.replace(`/profile/${preview.inviter.id}`);
    } catch (cause) {
      setError(readableError(cause, 'Could not accept this invite.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={{ height: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>add to your village</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 22 }}>
        <View>
          <Text style={styles.eyebrow}>PRIVATE BY DESIGN</Text>
          <Text style={{ fontFamily: fonts.serifRegular, fontSize: 36, lineHeight: 39, color: colors.dark, paddingTop: 4 }}>invite someone you already know</Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.brownMid, paddingTop: 10 }}>
            Village doesn’t publish a parent directory. Every connection begins with a private invitation and both people choosing yes.
          </Text>
        </View>

        {invite && link ? (
          <View style={styles.qrCard}>
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.white }}>
              <QRCode value={link} size={188} color={colors.dark} backgroundColor={colors.white} />
            </View>
            <Text style={styles.eyebrow}>INVITE CODE</Text>
            <Text selectable style={{ fontFamily: fonts.monoBold, fontSize: 25, letterSpacing: 2.5, color: colors.dark }}>{invite.code}</Text>
            <Text style={styles.help}>Expires {formatDate(invite.expires_at)} · up to {invite.max_uses} people</Text>
            <TerracottaButton label={busy === 'share' ? 'opening share sheet…' : 'share private invite →'} onPress={share} fullWidth disabled={busy !== null} />
          </View>
        ) : (
          <Pressable onPress={create} disabled={busy !== null} style={styles.createCard}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              {busy === 'create' ? <ActivityIndicator color={colors.terracotta} /> : <Icon name="qrcode" size={27} color={colors.terracotta} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansExtra, fontSize: 15, color: colors.dark }}>Create a private invite</Text>
              <Text style={styles.help}>Get a QR code, link, and short code that expire in seven days.</Text>
            </View>
            <Icon name="chevron.right" size={18} color={colors.taupe} />
          </Pressable>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.eyebrow}>SEND TO ONE PERSON</Text>
          <Text style={styles.sectionTitle}>invite by email</Text>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="parent@example.com" placeholderTextColor={colors.taupe} style={styles.field} />
          <Pressable disabled={busy !== null} onPress={sendEmail} style={styles.secondaryButton}>
            {busy === 'email' ? <ActivityIndicator color={colors.terracotta} /> : <><Icon name="paper.plane" size={17} color={colors.terracotta} /><Text style={styles.secondaryButtonText}>open email invite</Text></>}
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.eyebrow}>HAVE A CODE?</Text>
          <Text style={styles.sectionTitle}>join their village</Text>
          <TextInput value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={36} placeholder="8-character invite code" placeholderTextColor={colors.taupe} style={[styles.field, { fontFamily: fonts.monoBold, letterSpacing: 1.2 }]} />
          <Pressable disabled={busy !== null || !code.trim()} onPress={join} style={[styles.secondaryButton, !code.trim() && { opacity: 0.45 }]}>
            {busy === 'join' ? <ActivityIndicator color={colors.terracotta} /> : <><Icon name="wave" size={18} color={colors.terracotta} /><Text style={styles.secondaryButtonText}>accept invitation</Text></>}
          </Pressable>
        </View>

        {error ? <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

const styles = {
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  help: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.taupe, paddingTop: 3 } as const,
  qrCard: { alignItems: 'center', gap: 12, padding: 20, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  createCard: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  sectionCard: { gap: 12, padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  sectionTitle: { fontFamily: fonts.serifRegular, fontSize: 25, color: colors.dark } as const,
  field: { height: 46, paddingHorizontal: 12, borderRadius: radii.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.rule, fontFamily: fonts.sansSemi, fontSize: 14, color: colors.dark } as const,
  secondaryButton: { minHeight: 43, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream } as const,
  secondaryButtonText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
};
