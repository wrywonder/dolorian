import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Icon, TerracottaButton } from '@/components/ui';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { readableError } from '@/lib/error-message';
import { connectionInviteMessage, connectionInviteUrl } from '@/lib/invite-links';
import type { ConnectionInvite } from '@/types';

type BusyAction = 'load' | 'share' | 'copy' | 'join';

export function AddToVillageScreen() {
  const [invite, setInvite] = useState<ConnectionInvite | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<BusyAction | null>('load');
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = useMemo(
    () => invite ? connectionInviteUrl(invite.token) : null,
    [invite],
  );

  const loadInvite = async () => {
    setBusy('load');
    setError(null);
    try {
      setInvite(await data.getOrCreateConnectionInvite());
    } catch (cause) {
      setError(readableError(cause, 'Could not prepare your invite.'));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => { void loadInvite(); }, []);

  const share = async () => {
    if (!link) return;
    setBusy('share');
    setError(null);
    try {
      await Share.share({
        title: 'Connect with me in Village',
        message: connectionInviteMessage(link),
      });
    } catch (cause) {
      setError(readableError(cause, 'Could not open sharing.'));
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!link) return;
    setBusy('copy');
    setError(null);
    try {
      await Clipboard.setStringAsync(link);
      setCopied(true);
    } catch (cause) {
      setError(readableError(cause, 'Could not copy your link.'));
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    if (!code.trim()) return;
    setBusy('join');
    setError(null);
    try {
      const reference = code.trim();
      const preview = await data.previewConnectionInvite(reference);
      if (!preview.found || !preview.active || !preview.inviter) {
        throw new Error('That invite is invalid or expired.');
      }
      if (preview.is_self) throw new Error('That is your own invite code.');
      if (!preview.already_connected) await data.redeemConnectionInvite(reference);
      router.replace(`/profile/${preview.inviter.id}`);
    } catch (cause) {
      setError(readableError(cause, 'Could not accept this invite.'));
    } finally {
      setBusy(null);
    }
  };

  const unavailable = busy !== null || !link;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={19} color={colors.dark} /></View>
        </Pressable>
        <Text style={styles.headerTitle}>add friends</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.eyebrow}>YOUR PRIVATE INVITE</Text>
          <Text style={styles.title}>bring your people into Village</Text>
          <Text style={styles.intro}>
            Send one trusted link in WhatsApp, Messages, or wherever you already talk. They’ll see your profile before choosing to connect.
          </Text>
        </View>

        <View style={styles.shareCard}>
          <View style={styles.shareIcon}>
            {busy === 'load' ? <ActivityIndicator color={colors.terracotta} /> : <Icon name="person.2" size={26} color={colors.terracotta} />}
          </View>
          <Text style={styles.sectionTitle}>share your Village link</Text>
          <Text style={styles.help}>
            {invite
              ? `This link works for up to ${invite.max_uses} parent${invite.max_uses === 1 ? '' : 's'} and can be revoked anytime.`
              : 'Preparing one private link you can share and revoke anytime.'}
          </Text>
          <TerracottaButton
            label={busy === 'share' ? 'opening sharing…' : 'share my link →'}
            onPress={share}
            fullWidth
            disabled={unavailable}
          />

          <View style={styles.actionRow}>
            <Pressable disabled={unavailable} onPress={copy} style={[styles.secondaryButton, unavailable && styles.disabled]}>
              {busy === 'copy' ? <ActivityIndicator size="small" color={colors.terracotta} /> : <Icon name="link" size={17} color={colors.terracotta} />}
              <Text style={styles.secondaryButtonText}>{copied ? 'copied!' : 'copy link'}</Text>
            </Pressable>
            <Pressable disabled={unavailable} onPress={() => setShowQr((value) => !value)} style={[styles.secondaryButton, unavailable && styles.disabled]}>
              <Icon name="qrcode" size={18} color={colors.terracotta} />
              <Text style={styles.secondaryButtonText}>{showQr ? 'hide QR' : 'show QR'}</Text>
            </Pressable>
          </View>

          {showQr && link ? (
            <View style={styles.qrArea}>
              <View style={styles.qrCode}>
                <QRCode value={link} size={184} color={colors.dark} backgroundColor={colors.white} />
              </View>
              <Text style={styles.help}>Have your friend scan this with their phone camera.</Text>
            </View>
          ) : null}

          {invite ? (
            <View style={styles.linkDetails}>
              <Text style={styles.eyebrow}>BACKUP CODE</Text>
              <Text selectable style={styles.inviteCode}>{invite.code}</Text>
              <Text style={styles.help}>Link expires {formatDate(invite.expires_at)}</Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text selectable style={styles.error}>{error}</Text>
            {!invite ? <Pressable onPress={loadInvite}><Text style={styles.retry}>try again</Text></Pressable> : null}
          </View>
        ) : null}

        <Pressable onPress={() => setShowCodeEntry((value) => !value)} style={styles.codeDisclosure}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>HAVE THEIR CODE?</Text>
            <Text style={styles.codeDisclosureTitle}>enter an invite code</Text>
          </View>
          <View style={{ transform: [{ rotate: showCodeEntry ? '90deg' : '0deg' }] }}>
            <Icon name="chevron.right" size={18} color={colors.taupe} />
          </View>
        </Pressable>

        {showCodeEntry ? (
          <View style={styles.codeCard}>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={36}
              placeholder="8-character invite code"
              placeholderTextColor={colors.taupe}
              style={styles.field}
            />
            <Pressable disabled={busy !== null || !code.trim()} onPress={join} style={[styles.joinButton, (!code.trim() || busy !== null) && styles.disabled]}>
              {busy === 'join' ? <ActivityIndicator color={colors.terracotta} /> : <><Icon name="wave" size={18} color={colors.terracotta} /><Text style={styles.secondaryButtonText}>connect</Text></>}
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.privacy}>Connections are mutual, private, and always under your control.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

const styles = {
  header: { height: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' } as const,
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark } as const,
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' } as const,
  content: { padding: 20, paddingBottom: 48, gap: 18 } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe } as const,
  title: { fontFamily: fonts.serifRegular, fontSize: 36, lineHeight: 39, color: colors.dark, paddingTop: 4 } as const,
  intro: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.brownMid, paddingTop: 10 } as const,
  shareCard: { alignItems: 'center', gap: 12, padding: 20, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  shareIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' } as const,
  sectionTitle: { fontFamily: fonts.serifRegular, fontSize: 27, color: colors.dark, textAlign: 'center' } as const,
  help: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.taupe, textAlign: 'center' } as const,
  actionRow: { width: '100%', flexDirection: 'row', gap: 9 } as const,
  secondaryButton: { minHeight: 44, flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream } as const,
  secondaryButtonText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
  disabled: { opacity: 0.45 } as const,
  qrArea: { width: '100%', alignItems: 'center', gap: 10, paddingTop: 5 } as const,
  qrCode: { padding: 15, borderRadius: radii.lg, backgroundColor: colors.white } as const,
  linkDetails: { width: '100%', alignItems: 'center', gap: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.rule } as const,
  inviteCode: { fontFamily: fonts.monoBold, fontSize: 20, letterSpacing: 2.2, color: colors.dark } as const,
  errorCard: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  error: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
  retry: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta } as const,
  codeDisclosure: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  codeDisclosureTitle: { fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark, paddingTop: 3 } as const,
  codeCard: { gap: 10, padding: 14, marginTop: -8, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule } as const,
  field: { height: 46, paddingHorizontal: 12, borderRadius: radii.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.rule, fontFamily: fonts.monoBold, fontSize: 14, letterSpacing: 1.2, color: colors.dark } as const,
  joinButton: { minHeight: 43, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream } as const,
  privacy: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: colors.taupe, textAlign: 'center', paddingHorizontal: 20 } as const,
};
