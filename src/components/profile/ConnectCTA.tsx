import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { Icon, TerracottaButton } from '@/components/ui';
import type { ConnectionStatus, Parent } from '@/types';

type ConnectCTAProps = {
  parent: Parent;
  status: ConnectionStatus | 'none';
  /** True when the pending row was initiated by the viewer (not the displayed parent). */
  pendingInitiatedByMe: boolean;
  onConnect: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
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
          label={`Accept ${firstName}'s connection`}
          fullWidth
          withConfetti
          onPress={onAccept}
          iconLeft={<Icon name="wave" size={22} color={colors.white} weight={2.4} />}
        />
        <Text
          onPress={onDecline}
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
      </View>
    );
  }

  // Default: not connected / declined → primary CTA
  return (
    <View>
      <TerracottaButton
        label={`Connect with ${firstName}`}
        fullWidth
        withConfetti
        onPress={onConnect}
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
    </View>
  );
}
