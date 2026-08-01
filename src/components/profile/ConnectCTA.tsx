import { useState } from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { Icon, TerracottaButton } from '@/components/ui';
import type { ConnectionStatus, Parent } from '@/types';

type ConnectCTAProps = {
  parent: Parent;
  status: ConnectionStatus | 'none';
  /** True when the pending row was initiated by the viewer (not the displayed parent). */
  pendingInitiatedByMe: boolean;
  onConnect: () => Promise<void> | void;
  onAccept?: () => Promise<void> | void;
  onDecline?: () => Promise<void> | void;
};

/**
 * Hero CTA + helper copy. State machine:
 *   none / declined → "Connect with <name>" + confetti
 *   pending (I initiated) → "Waiting for <name> ↻" disabled
 *   pending (they initiated) → "Accept <name>'s connection" + Decline
 *   connected → subtle "✓ Connected" pill
 */
export function ConnectCTA({
  parent,
  status,
  pendingInitiatedByMe,
  onConnect,
  onAccept,
  onDecline,
}: ConnectCTAProps) {
  const firstName = parent.display_name.split(' ')[0] ?? parent.display_name;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action?: () => Promise<void> | void) => {
    if (!action || busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const errorCopy = error ? (
    <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 17, color: colors.terracotta, textAlign: 'center', marginTop: 8 }}>
      {error}
    </Text>
  ) : null;

  if (status === 'connected') {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 18,
            paddingVertical: 12,
            backgroundColor: colors.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.rule,
          }}
        >
          <Icon name="check.circle" size={18} color={colors.sage} weight={2.2} />
          <Text
            style={{
              fontFamily: fonts.sansExtra,
              fontSize: 14,
              color: colors.sage,
            }}
          >
            Connected
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 13.5,
            color: colors.taupe,
            marginTop: 8,
          }}
        >
          you and {firstName} said yes
        </Text>
      </View>
    );
  }

  if (status === 'pending' && pendingInitiatedByMe) {
    return (
      <View>
        <TerracottaButton
          label={`Waiting for ${firstName} ↻`}
          fullWidth
          disabled
        />
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 13.5,
            color: colors.taupe,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          we'll let you know when {firstName} responds
        </Text>
      </View>
    );
  }

  if (status === 'pending' && !pendingInitiatedByMe) {
    return (
      <View>
        <TerracottaButton
          label={busy ? 'accepting…' : `Accept ${firstName}'s connection`}
          fullWidth
          withConfetti
          disabled={busy}
          onPress={() => run(onAccept)}
          iconLeft={<Icon name="wave" size={22} color={colors.white} weight={2.4} />}
        />
        <Text
          onPress={() => run(onDecline)}
          style={{
            fontFamily: fonts.serif,
            fontSize: 13.5,
            color: colors.taupe,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          decline · friendships, not follows
        </Text>
        {errorCopy}
      </View>
    );
  }

  // Default: not connected / declined → primary CTA
  return (
    <View>
      <TerracottaButton
        label={busy ? 'sending…' : `Connect with ${firstName}`}
        fullWidth
        withConfetti
        disabled={busy}
        onPress={() => run(onConnect)}
        iconLeft={<Icon name="wave" size={22} color={colors.white} weight={2.4} />}
      />
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 13.5,
          color: colors.taupe,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        both of you say yes · friendships, not follows
      </Text>
      {errorCopy}
    </View>
  );
}
