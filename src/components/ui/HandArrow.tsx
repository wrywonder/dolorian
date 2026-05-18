import Svg, { Path } from 'react-native-svg';

type HandArrowProps = {
  size?: number;
  color?: string;
  flip?: boolean;
};

/**
 * Hand-drawn curvy arrow with arrowhead — appears next to copy like
 * "warming up ↝" on the IRL tab. Set `flip` to mirror horizontally.
 */
export function HandArrow({ size = 50, color = '#C96442', flip = false }: HandArrowProps) {
  return (
    <Svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 50 30"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M2 22 Q 10 4, 25 12 T 46 8"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M40 4 L 46 8 L 41 14"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
