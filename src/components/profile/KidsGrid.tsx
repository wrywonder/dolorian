import { Text, View } from 'react-native';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { PhotoTile } from '@/components/ui';
import { ageInYears } from '@/lib/format';
import type { Kid } from '@/types';

type KidsGridProps = {
  kids: Kid[];
};

const KID_TONES: AvatarTone[] = ['sage', 'butter', 'peach', 'mauve', 'slate', 'rose'];
const KID_ROTATIONS = [-3, 2.5, -2, 3, -1];

/**
 * 2-column polaroid grid of kids. Each card sits at a slight rotation
 * for the scrapbook feel, with a striped photo placeholder, italic
 * name, and "X yrs" in the bottom corner.
 */
export function KidsGrid({ kids }: KidsGridProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 6,
      }}
    >
      {kids.map((kid, i) => {
        const tone = KID_TONES[i % KID_TONES.length] ?? 'sage';
        const rotation = KID_ROTATIONS[i % KID_ROTATIONS.length] ?? 0;
        const age = ageInYears(kid.birth_year);
        return (
          <View
            key={kid.id}
            style={{
              flexBasis: '46%',
              flexGrow: 1,
              backgroundColor: colors.white,
              padding: 8,
              paddingBottom: 10,
              borderRadius: 4,
              shadowColor: '#2D241B',
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 14,
              elevation: 4,
              transform: [{ rotate: `${rotation}deg` }],
            }}
          >
            <PhotoTile tone={tone} height={90} label={kid.name.toLowerCase()} radius={2} />
            <View
              style={{
                marginTop: 8,
                paddingHorizontal: 4,
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 17,
                  color: colors.dark,
                  lineHeight: 18,
                }}
              >
                {kid.name}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 11,
                  color: colors.taupe,
                }}
              >
                {age} yrs
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
