import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '@/lib/constants';
import { Sparkle } from './Sparkle';

type SparkleTextProps = {
  children: string;
  size?: number;
  color?: string;
  /** Which side(s) of the text to flank with sparkles. */
  position?: 'right' | 'left' | 'both';
  textStyle?: StyleProp<TextStyle>;
  style?: ViewStyle;
};

/**
 * Inline text decoration — pairs a Sparkle SVG with a text label.
 * Used in headers like "IRL ✦" and tab labels when active.
 */
export function SparkleText({
  children,
  size = 12,
  color = colors.amberLight,
  position = 'right',
  textStyle,
  style,
}: SparkleTextProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      {(position === 'left' || position === 'both') && <Sparkle size={size} color={color} />}
      <Text style={textStyle}>{children}</Text>
      {(position === 'right' || position === 'both') && <Sparkle size={size} color={color} />}
    </View>
  );
}
