import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type DottedUnderlineProps = {
  children: string;
  color?: string;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Inline-style dotted/dashed underline — used in the nudge prompt
 * to mark the activity name ("share a moment from <ballet>").
 *
 * RN can't truly inline an SVG into a text run, so this renders the
 * text inside its own View with an absolutely-positioned squiggle SVG.
 * Wrap in `<Text>` siblings for the surrounding prose.
 */
export function DottedUnderline({
  children,
  color = '#C96442',
  textStyle,
}: DottedUnderlineProps) {
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Text style={textStyle}>{children}</Text>
      <Svg
        width="100%"
        height={6}
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, bottom: -2 }}
      >
        <Path
          d="M2 3 Q 25 -2, 50 3 T 98 3"
          stroke={color}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="3 3"
          opacity={0.7}
        />
      </Svg>
    </View>
  );
}
