import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';

type ActivityChipsRowProps = {
  chips: string[];
};

/** Small pill row showing the venues a parent is active at. */
export function ActivityChipsRow({ chips }: ActivityChipsRowProps) {
  if (chips.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 20,
      }}
    >
      {chips.map((c) => (
        <View
          key={c}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.rule,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: 12.5,
              color: colors.dark,
            }}
          >
            {c}
          </Text>
        </View>
      ))}
    </View>
  );
}
