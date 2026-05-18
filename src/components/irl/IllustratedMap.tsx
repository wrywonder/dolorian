import { Text, View, type LayoutChangeEvent } from 'react-native';
import { useState } from 'react';
import { colors, type AvatarTone } from '@/lib/constants';
import { PhotoAvatar } from '@/components/ui';
import { TwinkleSparkle } from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import type { NearbyParent, UUID } from '@/types';
import { fonts } from '@/lib/constants';

type IllustratedMapProps = {
  /** Connected parents currently visible at a venue. */
  pins: NearbyParent[];
  /** The current user's parent id — drawn with a terracotta ring. */
  meId: UUID;
};

/**
 * Stylized green-park map matching the design — illustrated blobs,
 * cream roads, scattered tree dots. Not a real map; venue → pixel
 * position is hardcoded per venue id.
 *
 * Multiple parents at the same venue render as a stacked photo-avatar
 * cluster with one shared label bubble.
 */
export function IllustratedMap({ pins, meId }: IllustratedMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  // Group pins by venue so co-located parents stack at one position.
  const groups = new Map<UUID | 'unknown', NearbyParent[]>();
  for (const pin of pins) {
    const key = pin.venue?.id ?? 'unknown';
    const arr = groups.get(key) ?? [];
    arr.push(pin);
    groups.set(key, arr);
  }

  return (
    <View
      onLayout={onLayout}
      style={{
        marginHorizontal: 14,
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#E9EFD9',
        borderWidth: 1,
        borderColor: colors.rule,
        shadowColor: '#2D241B',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 24,
        elevation: 6,
      }}
    >
      {/* Park blobs */}
      <View
        style={{
          position: 'absolute',
          left: 30,
          top: 50,
          width: 180,
          height: 130,
          borderRadius: 100,
          backgroundColor: '#C7DBA5',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 30,
          width: 160,
          height: 110,
          borderRadius: 100,
          backgroundColor: '#D3E4B0',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 30,
          bottom: 30,
          width: 220,
          height: 160,
          borderRadius: 130,
          backgroundColor: '#C7DBA5',
        }}
      />

      {/* Roads (cream stripes) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '52%',
          height: 12,
          backgroundColor: colors.cream,
          transform: [{ rotate: '-2deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '62%',
          width: 12,
          backgroundColor: colors.cream,
        }}
      />

      {/* Tree dots */}
      {TREE_POSITIONS.map(([x, y], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#7C9E6A',
          }}
        />
      ))}

      {/* Pins — placed only after we know the layout */}
      {size.w > 0 &&
        [...groups.entries()].map(([venueId, parents]) => {
          const pos = positionFor(venueId, size);
          const isMe = parents.some((p) => p.parent.id === meId);
          const venueLabel = parents[0]?.venue
            ? `${parents[0]!.venue!.name.split(' ')[0]?.toLowerCase() ?? ''} ${parents[0]!.venue!.emoji ?? ''}`.trim()
            : undefined;
          return (
            <MapPin
              key={venueId}
              x={pos.x}
              y={pos.y}
              parents={parents}
              meId={meId}
              showSparkle={isMe}
              labelOverride={isMe ? 'you 👋' : venueLabel}
            />
          );
        })}
    </View>
  );
}

const TREE_POSITIONS: [number, number][] = [
  [60, 55],
  [150, 75],
  [230, 55],
  [290, 140],
  [110, 250],
  [260, 310],
  [330, 360],
];

/**
 * Hardcoded venue-id → relative position. These don't correspond to
 * lat/lng — they're hand-chosen to match the design composition.
 * Coordinates are returned in absolute pixels for the given canvas size.
 */
function positionFor(
  venueId: string,
  size: { w: number; h: number },
): { x: number; y: number } {
  // x, y are normalized 0–1 then scaled to the actual canvas.
  const NORM: Record<string, { x: number; y: number }> = {
    'venue-cesar-chavez-park': { x: 0.18, y: 0.34 },
    'venue-studio-growlies': { x: 0.78, y: 0.24 },
    'venue-albany-aquatic': { x: 0.86, y: 0.74 },
    'venue-tilden-park': { x: 0.46, y: 0.78 },
    unknown: { x: 0.5, y: 0.5 },
  };
  const n = NORM[venueId] ?? NORM.unknown ?? { x: 0.5, y: 0.5 };
  return { x: n.x * size.w, y: n.y * size.h };
}

type MapPinProps = {
  x: number;
  y: number;
  parents: NearbyParent[];
  meId: UUID;
  showSparkle: boolean;
  labelOverride?: string;
};

function MapPin({ x, y, parents, meId, showSparkle, labelOverride }: MapPinProps) {
  const includesMe = parents.some((p) => p.parent.id === meId);
  const openProfile = useProfileLink();

  return (
    <View
      style={{
        position: 'absolute',
        left: x - 28,
        top: y - 28,
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* avatar cluster */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {parents.slice(0, 2).map((p, i) => (
          <PhotoAvatar
            key={p.parent.id}
            tone={p.parent.avatar_color as AvatarTone}
            size={includesMe ? 60 : 56}
            ringWidth={3}
            ringColor={
              p.parent.id === meId ? colors.terracotta : colors.white
            }
            onPress={() => openProfile(p.parent.id)}
            style={{
              marginLeft: i ? -18 : 0,
              shadowColor: p.parent.id === meId ? colors.terracotta : '#000',
              shadowOpacity: p.parent.id === meId ? 0.45 : 0.18,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: p.parent.id === meId ? 16 : 14,
            }}
          />
        ))}
      </View>

      {/* label bubble */}
      {labelOverride ? (
        <View
          style={{
            backgroundColor: includesMe ? colors.terracotta : colors.white,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 11,
            transform: [{ rotate: includesMe ? '0deg' : '-2deg' }],
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansExtra,
              fontSize: 11.5,
              color: includesMe ? colors.white : colors.dark,
            }}
          >
            {labelOverride}
          </Text>
        </View>
      ) : null}

      {showSparkle ? (
        <View
          style={{ position: 'absolute', top: -4, right: -10 }}
          pointerEvents="none"
        >
          <TwinkleSparkle size={14} color={colors.amberLight} />
        </View>
      ) : null}
    </View>
  );
}
