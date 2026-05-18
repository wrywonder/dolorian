import { Pressable, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { StripePattern } from './StripePattern';

type PhotoAvatarProps = {
  tone?: AvatarTone;
  size?: number;
  /** White ring around the avatar. Default 3px to match map pins. */
  ringWidth?: number;
  ringColor?: string;
  /** Optional mono label inside the circle (matches the prototype "PHOTO" overlays). */
  label?: string;
  /** When provided, becomes pressable with selection haptic. */
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Circular striped-pattern photo placeholder — used wherever a real
 * photo would go (map pins, post images, kid polaroid centers).
 *
 * In production this gets swapped for an Image, but the design uses
 * these placeholders everywhere as a load-bearing aesthetic choice.
 */
export function PhotoAvatar({
  tone = 'peach',
  size = 48,
  ringWidth = 3,
  ringColor = colors.white,
  label,
  onPress,
  style,
}: PhotoAvatarProps) {
  const body = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: ringColor,
          overflow: 'hidden',
          backgroundColor: ringColor,
        },
        style,
      ]}
    >
      <StripePattern tone={tone} radius={size / 2} />
      {label ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: size * 0.18,
              color: 'rgba(0,0,0,0.55)',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      hitSlop={4}
    >
      {body}
    </Pressable>
  );
}
