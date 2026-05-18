import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { Icon } from '@/components/ui';

type PhoneSwapRowProps = {
  /** When true (connected), tapping opens the phone-swap modal (Phase 10). */
  enabled: boolean;
  onPress?: () => void;
};

/**
 * Understated phone-swap row — italic-serif, small icon, taupe text.
 * Intentionally not a button per spec — "Connect" is the hero action.
 * Tap-target lives behind the row so it's discoverable but not loud.
 */
export function PhoneSwapRow({ enabled, onPress }: PhoneSwapRowProps) {
  const content = (
    <View
      style={{
        marginTop: 14,
        paddingHorizontal: 4,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Icon name="phone" size={14} color={colors.taupe} weight={1.8} />
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 13,
          color: colors.taupe,
        }}
      >
        {enabled
          ? 'tap to swap numbers'
          : 'once you connect → swap numbers'}
      </Text>
    </View>
  );

  return enabled && onPress ? (
    <Pressable onPress={onPress}>{content}</Pressable>
  ) : (
    content
  );
}
