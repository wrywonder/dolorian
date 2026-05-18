import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * SF-Symbols-inspired icon set with stroke + filled variants.
 * Names follow the SF convention (`heart` / `heart.fill`) so tab bars
 * and buttons can compute the active state via `${name}.fill`.
 *
 * Add new icons as needed; keep the viewBox 24x24 and stroke linecap/join round.
 */

export type IconName =
  | 'feed' | 'feed.fill'
  | 'map.pin' | 'map.pin.fill'
  | 'calendar' | 'calendar.fill'
  | 'person' | 'person.fill'
  | 'plus' | 'plus.circle' | 'plus.circle.fill'
  | 'sparkle' | 'heart' | 'heart.fill' | 'bubble'
  | 'chevron.right' | 'chevron.down' | 'x'
  | 'lock' | 'eye.slash' | 'check.circle'
  | 'camera' | 'phone' | 'search'
  | 'arrow.right' | 'arrow.up' | 'paper.plane'
  | 'wave' | 'sun' | 'gear' | 'bell';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: number;
};

export function Icon({ name, size = 24, color = '#2D241B', weight = 1.8 }: IconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: weight,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const dim = { width: size, height: size };

  switch (name) {
    case 'feed':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Rect x={3.5} y={4} width={17} height={6} rx={2} {...stroke} />
          <Rect x={3.5} y={13} width={17} height={7} rx={2} {...stroke} />
        </Svg>
      );
    case 'feed.fill':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Rect x={3.5} y={4} width={17} height={6} rx={2} fill={color} />
          <Rect x={3.5} y={13} width={17} height={7} rx={2} fill={color} />
        </Svg>
      );
    case 'map.pin':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" {...stroke} />
          <Circle cx={12} cy={9.5} r={2.4} {...stroke} />
        </Svg>
      );
    case 'map.pin.fill':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" fill={color} />
          <Circle cx={12} cy={9.5} r={2.4} fill="#fff" />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Rect x={3.5} y={5} width={17} height={15} rx={2.5} {...stroke} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...stroke} />
        </Svg>
      );
    case 'calendar.fill':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Rect x={3.5} y={5} width={17} height={15} rx={2.5} fill={color} />
          <Path d="M3.5 10h17" stroke="#fff" strokeWidth={weight} />
          <Path d="M8 3v4M16 3v4" {...stroke} />
        </Svg>
      );
    case 'person':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={8} r={3.6} {...stroke} />
          <Path d="M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5" {...stroke} />
        </Svg>
      );
    case 'person.fill':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={8} r={3.6} fill={color} />
          <Path
            d="M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5"
            fill={color}
            stroke={color}
            strokeWidth={weight}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.2} />
        </Svg>
      );
    case 'plus.circle':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M12 8v8M8 12h8" {...stroke} />
        </Svg>
      );
    case 'plus.circle.fill':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} fill={color} />
          <Path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 3l1.6 5.4 5.4 1.6-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" {...stroke} />
          <Path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" {...stroke} strokeWidth={1.4} />
        </Svg>
      );
    case 'heart':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 20s-7-4.4-7-10A4 4 0 0 1 12 7a4 4 0 0 1 7 3c0 5.6-7 10-7 10Z" {...stroke} />
        </Svg>
      );
    case 'heart.fill':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 20s-7-4.4-7-10A4 4 0 0 1 12 7a4 4 0 0 1 7 3c0 5.6-7 10-7 10Z" fill={color} />
        </Svg>
      );
    case 'bubble':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M4 12a8 8 0 1 1 4.2 7L4 20l1-4.2A8 8 0 0 1 4 12Z" {...stroke} />
        </Svg>
      );
    case 'chevron.right':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M9 5l7 7-7 7" {...stroke} />
        </Svg>
      );
    case 'chevron.down':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M5 9l7 7 7-7" {...stroke} />
        </Svg>
      );
    case 'x':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M6 6l12 12M18 6L6 18" {...stroke} />
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Rect x={5} y={10} width={14} height={10} rx={2} {...stroke} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...stroke} />
        </Svg>
      );
    case 'eye.slash':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path
            d="M3 12s3-7 9-7c2 0 3.7.7 5 1.8M21 12s-3 7-9 7c-2 0-3.7-.7-5-1.8M4 4l16 16"
            {...stroke}
          />
        </Svg>
      );
    case 'check.circle':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M8 12.5l2.5 2.5L16 9.5" {...stroke} />
        </Svg>
      );
    case 'camera':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path
            d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z"
            {...stroke}
          />
          <Circle cx={12} cy={13} r={3.5} {...stroke} />
        </Svg>
      );
    case 'phone':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path
            d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"
            {...stroke}
          />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={6} {...stroke} />
          <Path d="M16 16l4 4" {...stroke} />
        </Svg>
      );
    case 'arrow.right':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M5 12h14M13 6l6 6-6 6" {...stroke} />
        </Svg>
      );
    case 'arrow.up':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M12 19V5M6 11l6-6 6 6" {...stroke} />
        </Svg>
      );
    case 'paper.plane':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M21 3L3 11l7 2 2 7 9-17Z" {...stroke} />
        </Svg>
      );
    case 'wave':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M3 14c2-3 4-3 6 0s4 3 6 0 4-3 6 0" {...stroke} />
        </Svg>
      );
    case 'sun':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3.5} {...stroke} />
          <Path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"
            {...stroke}
          />
        </Svg>
      );
    case 'gear':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3} {...stroke} />
          <Path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"
            {...stroke}
          />
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...dim} viewBox="0 0 24 24">
          <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0" {...stroke} />
        </Svg>
      );
  }
}
