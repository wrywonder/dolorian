import { Pressable, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { avatarTones, fonts, type AvatarTone } from '@/lib/constants';

type AvatarCircleProps = {
  initials: string;
  tone?: AvatarTone;
  size?: number;
  ring?: string;
  /** When provided, the avatar becomes pressable with selection haptic. */
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Solid-fill initials avatar — for profile headers, post bylines, and
 * activity-card social proof stacks. Hannah's "HG" on the You screen
 * is this primitive at size=92 with a white ring.
 *
 * For striped photo-style avatars (map pins, post images), use PhotoAvatar.
 */
export function AvatarCircle({
  initials,
  tone = 'peach',
  size = 40,
  ring,
  onPress,
  style,
}: AvatarCircleProps) {
  const { light, dark } = avatarTones[tone];
  const ringStyle: ViewStyle = ring
    ? {
        shadowColor: '#000',
        shadowOpacity: 0,
        borderColor: ring,
        borderWidth: 2.5,
      }
    : {};

  const body = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark,
          overflow: 'hidden',
        },
        ringStyle,
        style,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: light,
          opacity: 0.7,
        }}
      />
      <Text
        style={{
          fontFamily: fonts.sansBold,
          fontSize: size * 0.34,
          color: 'rgba(0,0,0,0.55)',
        }}
      >
        {initials}
      </Text>
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
