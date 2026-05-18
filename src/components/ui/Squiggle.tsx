import Svg, { Path } from 'react-native-svg';

type SquiggleProps = {
  width?: number;
  color?: string;
  strokeWidth?: number;
};

/**
 * Hand-drawn squiggle line — sits under page titles ("buzz", "plans").
 * Always 10px tall; width controls how many waves render.
 */
export function Squiggle({ width = 60, color = '#C96442', strokeWidth = 2.2 }: SquiggleProps) {
  return (
    <Svg width={width} height={10} viewBox="0 0 60 10">
      <Path
        d="M2 6 Q 10 1, 18 6 T 34 6 T 50 6 T 58 6"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
