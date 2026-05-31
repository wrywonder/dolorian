import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { AvatarCircle, Icon } from '@/components/ui';
import type { IncomingRequest } from '@/types';

type RequestsInboxProps = {
  /** Fired after a request is accepted/declined so the parent can refresh
   *  counts (mutual friends, etc.). */
  onChanged?: () => void;
};

/**
 * The You-tab requests inbox. Lists incoming connection requests — people who
 * invited you by email/phone, or who tapped Connect on your profile — each
 * with Accept / Decline. Empty until someone reaches out, so it renders
 * nothing (not an empty state) to keep the profile clean.
 */
export function RequestsInbox({ onChanged }: RequestsInboxProps) {
  const [requests, setRequests] = useState<IncomingRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await data.getIncomingRequests());
    } catch {
      setRequests([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const respond = useCallback(
    async (req: IncomingRequest, accept: boolean) => {
      setBusy(req.connection_id);
      Haptics.impactAsync(
        accept ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
      try {
        await data.respondToRequest(req.connection_id, accept);
        setRequests((prev) => (prev ?? []).filter((r) => r.connection_id !== req.connection_id));
        onChanged?.();
      } finally {
        setBusy(null);
      }
    },
    [onChanged],
  );

  if (!requests || requests.length === 0) return null;

  return (
    <View style={{ marginBottom: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: fonts.monoBold,
            fontSize: 11,
            color: colors.brownMid,
            letterSpacing: 0.7,
          }}
        >
          REQUESTS
        </Text>
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 5,
            backgroundColor: colors.terracotta,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.sansExtra, fontSize: 11, color: colors.white }}>
            {requests.length}
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {requests.map((req) => {
          const firstName = req.display_name.split(' ')[0] ?? req.display_name;
          const isBusy = busy === req.connection_id;
          return (
            <View
              key={req.connection_id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.rule,
                padding: 12,
              }}
            >
              <Pressable
                onPress={() => router.push(`/profile/${req.parent_id}`)}
                hitSlop={6}
              >
                <AvatarCircle
                  initials={req.avatar_initials}
                  tone={req.avatar_color as AvatarTone}
                  size={46}
                />
              </Pressable>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sansExtra, fontSize: 15, color: colors.dark }}
                >
                  {req.display_name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.serif, fontSize: 13.5, color: colors.taupe }}
                >
                  wants to connect{req.neighborhood ? ` · ${req.neighborhood}` : ''}
                </Text>
              </View>

              {isBusy ? (
                <ActivityIndicator color={colors.terracotta} style={{ width: 76 }} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable
                    onPress={() => respond(req, false)}
                    hitSlop={6}
                    accessibilityLabel={`Decline ${firstName}`}
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
                  <Pressable
                    onPress={() => respond(req, true)}
                    hitSlop={6}
                    accessibilityLabel={`Accept ${firstName}`}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: colors.terracotta,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="check.circle" size={18} color={colors.white} weight={2.4} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
