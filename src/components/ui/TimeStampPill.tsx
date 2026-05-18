import { Text, View, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/lib/constants';

type TimeStampPillProps = {
  /** e.g. "SAT · 22m", "SAT · 24". */
  label: string;
  /** "light" sits on a photo (white bg); "dark" inverts for cream-bg use. */
  variant?: 'light' | 'dark';
  /** Subtle rotation in degrees for the sticker effect. */
  rotation?: number;
  style?: ViewStyle;
};

/**
 * Small all-caps timestamp pill — the rotated "SAT · 22m" sticker on
 * post cards and the "SAT · 24" tag on activity card headers.
 */
export function TimeStampPill({
  label,
  variant = 'light',
  rotation = 0,
  style,
}: TimeStampPillProps) {
  const isLight = variant === 'light';
  return (
    <View
      style={[
        {
          backgroundColor: isLight ? colors.amberLight : colors.dark,
          paddingHorizontal: 11,
          paddingVertical: 6,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: colors.white,
          shadowColor: '#B48C28',
          shadowOpacity: 0.35,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 8,
          elevation: 4,
          transform: rotation ? [{ rotate: `${rotation}deg` }] : undefined,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.monoBold,
          fontSize: 10.5,
          color: isLight ? colors.dark : colors.white,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
