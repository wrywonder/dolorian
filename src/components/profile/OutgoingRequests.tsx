import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { AvatarCircle, Icon } from '@/components/ui';
import type { OutgoingRequest } from '@/types';

type OutgoingRequestsProps = {
  /** Fired after a cancel so the parent can refresh related counts. */
  onChanged?: () => void;
};

/**
 * The "sent" list on the You tab — connection requests awaiting a reply and
 * invites to people who haven't joined yet, each cancellable. Renders nothing
 * when there's nothing outstanding, to keep the profile clean.
 */
export function OutgoingRequests({ onChanged }: OutgoingRequestsProps) {
  const [items, setItems] = useState<OutgoingRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await data.getOutgoingRequests());
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cancel = useCallback(
    async (item: OutgoingRequest) => {
      setBusy(item.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        await data.cancelOutgoing(item.kind, item.id);
        setItems((prev) => (prev ?? []).filter((r) => r.id !== item.id));
        onChanged?.();
      } finally {
        setBusy(null);
      }
    },
    [onChanged],
  );

  if (!items || items.length === 0) return null;

  return (
    <View style={{ marginBottom: 26 }}>
      <Text
        style={{
          fontFamily: fonts.monoBold,
          fontSize: 11,
          color: colors.brownMid,
          letterSpacing: 0.7,
          marginBottom: 12,
        }}
      >
        SENT
      </Text>

      <View style={{ gap: 10 }}>
        {items.map((item) => {
          const isBusy = busy === item.id;
          const isInvite = item.kind === 'invite';
          const primary = isInvite
            ? (item.handle ?? 'invite')
            : (item.display_name ?? 'someone');
          const sub = isInvite ? 'invited · not on dolorian yet' : 'waiting for a reply';

          return (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.rule,
                padding: 12,
                opacity: isInvite ? 0.92 : 1,
              }}
            >
              {isInvite ? (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    borderWidth: 1.5,
                    borderColor: colors.rule,
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="paper.plane" size={18} color={colors.taupe} weight={2} />
                </View>
              ) : (
                <Pressable
                  onPress={() => item.parent_id && router.push(`/profile/${item.parent_id}`)}
                  hitSlop={6}
                >
                  <AvatarCircle
                    initials={item.avatar_initials ?? '?'}
                    tone={(item.avatar_color as AvatarTone) ?? 'peach'}
                    size={46}
                  />
                </Pressable>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sansExtra, fontSize: 15, color: colors.dark }}
                >
                  {primary}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.serif, fontSize: 13.5, color: colors.taupe }}
                >
                  {sub}
                </Text>
              </View>

              {isBusy ? (
                <ActivityIndicator color={colors.terracotta} style={{ width: 38 }} />
              ) : (
                <Pressable
                  onPress={() => cancel(item)}
                  hitSlop={6}
                  accessibilityLabel={isInvite ? 'Revoke invite' : 'Withdraw request'}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: 1,
                    borderColor: colors.rule,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="x" size={16} color={colors.taupe} weight={2.2} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
