import { Pressable, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { AvatarCircle } from './AvatarCircle';
import { PulseDot } from './PulseDot';
import { TwinkleSparkle } from './TwinkleSparkle';

type VisibilityChipProps = {
  /** Drives the dot animation + text tone. When false, chip reads "tucked away". */
  visible?: boolean;
  /** Small avatar stack of other parents currently visible. */
  visibleParents?: { initials: string; tone: AvatarTone }[];
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Always-on visibility indicator that lives in the top-right of Buzz
 * and IRL headers. Single source of truth — both screens read the same
 * zustand slice and tap-to-toggle propagates everywhere.
 */
export function VisibilityChip({
  visible = true,
  visibleParents = [],
  onPress,
  style,
}: VisibilityChipProps) {
  const handlePress = () => {
    if (!onPress) return;
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          paddingLeft: 8,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: visible ? colors.rule : '#E5DDD0',
          shadowColor: '#B48C28',
          shadowOpacity: visible ? 0.1 : 0,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 3,
          alignSelf: 'flex-start',
          opacity: visible ? 1 : 0.78,
        },
        style,
      ]}
    >
      <View style={{ marginLeft: 2 }}>
        {visible ? (
          <PulseDot size={9} color={colors.golden} />
        ) : (
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: colors.taupe,
              opacity: 0.6,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontFamily: fonts.sansExtra,
          fontSize: 12,
          color: visible ? '#8A6B22' : colors.taupe,
          letterSpacing: 0.1,
        }}
      >
        {visible ? 'out & about' : 'off the map'}
      </Text>

      {visible && visibleParents.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            borderLeftWidth: 1,
            borderLeftColor: colors.rule,
            paddingLeft: 6,
          }}
        >
          {visibleParents.slice(0, 3).map((p, i) => (
            <AvatarCircle
              key={`${p.initials}-${i}`}
              initials=""
              tone={p.tone}
              size={18}
              style={{
                marginLeft: i ? -6 : 0,
                borderWidth: 1.5,
                borderColor: colors.surface,
              }}
            />
          ))}
        </View>
      ) : null}

      {visible ? (
        <View style={{ position: 'absolute', top: -3, right: -2 }} pointerEvents="none">
          <TwinkleSparkle size={9} color={colors.golden} />
        </View>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable onPress={handlePress} hitSlop={6}>
      {content}
    </Pressable>
  ) : (
    content
  );
}
