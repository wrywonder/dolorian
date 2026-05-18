import { ScrollView, Text, View } from 'react-native';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { FadeOverlay, HandArrow, PhotoTile } from '@/components/ui';
import type { Venue } from '@/types';

type WarmingUpStripProps = {
  items: { venue: Venue; count: number }[];
};

/**
 * Horizontal photo-tile rail of venues with connected-parent activity.
 * Each tile fades to dark at the bottom so the emoji + name + count
 * read clearly. Three tiles fit roughly across an iPhone width.
 */
export function WarmingUpStrip({ items }: WarmingUpStripProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 17,
            color: colors.dark,
            lineHeight: 20,
          }}
        >
          warming up
        </Text>
        <HandArrow size={36} color={colors.terracotta} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {items.slice(0, 6).map((c, i) => (
          <View
            key={c.venue.id}
            style={{
              width: 110,
              height: 86,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.rule,
              transform: i === 1 ? [{ rotate: '-1deg' }] : undefined,
              position: 'relative',
            }}
          >
            <PhotoTile tone={toneForVenue(c.venue)} height={86} radius={0} />
            <FadeOverlay direction="bottom" intensity={0.65} transparentUntil={0} />
            <View
              style={{
                position: 'absolute',
                left: 9,
                right: 9,
                bottom: 8,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.sansExtra,
                  fontSize: 12,
                  color: colors.white,
                  lineHeight: 14,
                }}
              >
                {c.venue.emoji ?? ''} {c.venue.name}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 10.5,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {c.count > 0
                  ? `${c.count} ${c.count === 1 ? 'family' : 'families'}`
                  : 'quiet'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function toneForVenue(v: Venue): AvatarTone {
  switch (v.venue_type) {
    case 'park':
      return 'butter';
    case 'studio':
      return 'mauve';
    case 'swim':
      return 'slate';
    case 'library':
      return 'sage';
    default:
      return 'peach';
  }
}
