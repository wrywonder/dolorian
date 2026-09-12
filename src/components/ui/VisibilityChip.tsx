import { Pressable, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { AvatarCircle } from './AvatarCircle';
import { PulseDot } from './PulseDot';
import { TwinkleSparkle } from './TwinkleSparkle';
import type { VisibilityMode } from '@/types';

type VisibilityChipProps = {
  /** Whether a current visit is actually shared, independent of automatic mode. */
  visible?: boolean;
  mode?: VisibilityMode;
  /** Small avatar stack of other parents currently visible. */
  visibleParents?: { initials: string; tone: AvatarTone; imageUrl?: string | null }[];
  /** Opens IRL to inspect or manage sharing; never silently toggles a setting. */
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Current visit status in Buzz and IRL. Both headers use the shared presence
 * store; Buzz opens IRL when tapped so sharing changes stay explicit.
 */
export function VisibilityChip({
  visible = true,
  mode,
  visibleParents = [],
  onPress,
  style,
}: VisibilityChipProps) {
  const resolvedMode = mode ?? (visible ? 'on' : 'disabled');
  const active = visible || resolvedMode !== 'disabled';
  const accessibilityLabel = visible
    ? 'You are sharing a visit with your connections.'
    : `You are not sharing a visit. Automatic sharing is ${resolvedMode === 'auto' ? 'set to after five minutes' : resolvedMode === 'on' ? 'set to on arrival' : 'off'}.`;
  const handlePress = () => {
    if (!onPress) return;
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  const content = (
    <View
      accessible={!onPress}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
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
          borderColor: active ? colors.rule : '#E5DDD0',
          shadowColor: '#B48C28',
          shadowOpacity: active ? 0.1 : 0,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 3,
          alignSelf: 'flex-start',
          opacity: active ? 1 : 0.78,
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
          color: active ? '#8A6B22' : colors.taupe,
          letterSpacing: 0.1,
        }}
      >
        {visible ? 'sharing a visit' : resolvedMode === 'auto' ? 'auto · not sharing' : resolvedMode === 'on' ? 'on arrival · ready' : 'off the map'}
      </Text>

      {active && visibleParents.length > 0 ? (
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
              imageUrl={p.imageUrl}
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

      {active ? (
        <View style={{ position: 'absolute', top: -3, right: -2 }} pointerEvents="none">
          <TwinkleSparkle size={9} color={colors.golden} />
        </View>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint="Opens IRL to view or manage your sharing." onPress={handlePress} hitSlop={6}>
      {content}
    </Pressable>
  ) : (
    content
  );
}
