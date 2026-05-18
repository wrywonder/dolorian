import Svg, { Path } from 'react-native-svg';

type SparkleProps = {
  size?: number;
  color?: string;
};

/**
 * 4-point sparkle/star — used as accent decoration around CTAs,
 * active tab pills, visibility chips, and post cards.
 */
export function Sparkle({ size = 14, color = '#E8A93A' }: SparkleProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path d="M7 0.5 L8.2 5.3 L13 6.5 L8.2 7.7 L7 12.5 L5.8 7.7 L1 6.5 L5.8 5.3 Z" fill={color} />
    </Svg>
  );
}
