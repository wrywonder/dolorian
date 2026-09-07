import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { planRsvpCopy } from '@/lib/plan-rsvp-copy';
import { Icon, TwinkleSparkle } from '@/components/ui';
import { useInterestSheet } from '@/store/interestSheet';
import type { InteractionState } from '@/types';

/**
 * Bottom action sheet for picking an activity interaction state.
 * Animated slide-up + backdrop fade. Matches the warm aesthetic — no
 * native Alert.alert.
 *
 * Mounted once in the (tabs) layout; cards call `useInterestSheet.present()`.
 */
export function InterestSheetHost() {
  const payload = useInterestSheet((s) => s.payload);
  const dismiss = useInterestSheet((s) => s.dismiss);
  const { height } = useWindowDimensions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (payload) {
      setError(null);
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [payload, translateY, backdropOpacity, height]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.45,
  }));

  if (!payload) return null;
  const copy = planRsvpCopy(payload.hasExternalListing);

  const handlePick = async (next: InteractionState | null) => {
    if (saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSaving(true);
    setError(null);
    try {
      if (next === null) {
        await data.clearPlanRsvp(payload.activityId);
      } else {
        await data.setPlanRsvp(payload.activityId, next as 'interested' | 'going' | 'out');
      }
      payload.onChanged(next);
      dismiss();
      if (payload.hasExternalListing && next === 'going') {
        router.push(`/plan/${payload.activityId}` as never);
      }
    } catch {
      setError('Could not update your response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={dismiss}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.cream,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 18,
            paddingBottom: 40,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: -6 },
            shadowRadius: 22,
          },
          sheetStyle,
        ]}
      >
        {/* drag handle */}
        <View
          style={{
            alignSelf: 'center',
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.rule,
            marginBottom: 14,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {payload.emoji ? (
            <Text style={{ fontSize: 28 }}>{payload.emoji}</Text>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.monoBold,
                fontSize: 11,
                color: colors.taupe,
                letterSpacing: 0.6,
              }}
            >
              {payload.hasExternalListing ? 'REGISTRATION STATUS' : "WHAT'S YOUR MOVE?"}
            </Text>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 22,
                color: colors.dark,
                letterSpacing: -0.3,
                lineHeight: 26,
              }}
            >
              {payload.activityName}
            </Text>
          </View>
          <TwinkleSparkle size={14} color={colors.amberLight} />
        </View>

        <View style={{ gap: 10, marginTop: 16 }}>
          <SheetButton
            label={payload.hasExternalListing ? "We're signed up" : "I'm going"}
            tint="terracotta"
            iconLeft={<Icon name="wave" size={20} color={colors.white} weight={2.4} />}
            selected={payload.currentState === 'going' || payload.currentState === 'attended'}
            disabled={saving}
            onPress={() => handlePick('going')}
          />
          {payload.hasExternalListing ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.taupe, textAlign: 'center', paddingHorizontal: 12 }}>
              Signed up opens the plan so you can add child, days, times, or group details.
            </Text>
          ) : null}
          <SheetButton
            label={copy.interested}
            tint="sage"
            iconLeft={<Icon name="sparkle" size={18} color={colors.sage} weight={2} />}
            selected={payload.currentState === 'interested'}
            disabled={saving}
            onPress={() => handlePick('interested')}
          />
          <SheetButton
            label={copy.out}
            tint="ghost"
            iconLeft={<Icon name="x" size={17} color={colors.taupe} weight={2} />}
            selected={payload.currentState === 'out'}
            disabled={saving}
            onPress={() => handlePick('out')}
          />
          {payload.currentState && payload.currentState !== 'skipped' ? (
            <SheetButton
              label="Remove"
              tint="ghost"
              disabled={saving}
              onPress={() => handlePick(null)}
            />
          ) : null}
          {error ? <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>{error}</Text> : null}
        </View>

        <Pressable
          onPress={dismiss}
          style={{ alignSelf: 'center', paddingTop: 18, paddingBottom: 6 }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 15,
              color: colors.taupe,
            }}
          >
            never mind
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

type SheetButtonProps = {
  label: string;
  tint: 'terracotta' | 'sage' | 'ghost';
  iconLeft?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function SheetButton({ label, tint, iconLeft, selected, disabled, onPress }: SheetButtonProps) {
  const isTerracotta = tint === 'terracotta';
  const isSage = tint === 'sage';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 52,
        borderRadius: 18,
        backgroundColor: isTerracotta ? colors.terracotta : colors.surface,
        borderWidth: isSage ? 1.5 : 0,
        borderColor: colors.sage,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: isTerracotta ? '#924328' : 'transparent',
        shadowOpacity: isTerracotta ? 0.35 : 0,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 0,
        elevation: isTerracotta ? 4 : 0,
        opacity: disabled ? 0.55 : selected ? 0.85 : 1,
      }}
    >
      {iconLeft}
      <Text
        style={{
          fontFamily: fonts.sansExtra,
          fontSize: 15,
          color: isTerracotta ? colors.white : isSage ? colors.sage : colors.brownMid,
        }}
      >
        {label}
        {selected ? ' ✓' : ''}
      </Text>
    </Pressable>
  );
}

/**
 * Imperative API matching the old call sites — opens the sheet.
 */
export function presentInterestSheet(args: {
  activityId: string;
  activityName: string;
  emoji: string | null;
  hasExternalListing: boolean;
  currentState: InteractionState | null;
  onChanged: (state: InteractionState | null) => void;
}) {
  useInterestSheet.getState().present(args);
}
