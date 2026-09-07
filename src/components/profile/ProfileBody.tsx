import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { Skeleton } from '@/components/ui';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import type { ProfileView, UUID } from '@/types';
import { ActivityChipsRow } from './ActivityChipsRow';
import { ConnectCTA } from './ConnectCTA';
import { KidsGrid } from './KidsGrid';
import { PhoneSwapRow } from './PhoneSwapRow';
import { ProfileHeader } from './ProfileHeader';

type ProfileBodyProps = {
  parentId: UUID;
  onSettings?: () => void;
};

export function ProfileBody({ parentId, onSettings }: ProfileBodyProps) {
  const myId = useCurrentParentId();
  const [view, setView] = useState<ProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await data.getProfile(parentId);
      if (!result) throw new Error('This profile is not available.');
      setView(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this profile.');
    }
  }, [parentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!view && error) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.cream }}>
        <Text selectable style={{ fontFamily: fonts.serifRegular, fontSize: 25, color: colors.dark, textAlign: 'center' }}>{error}</Text>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta }}>go back →</Text></Pressable>
      </View>
    );
  }

  if (!view) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <Skeleton width="100%" height={400} radius={0} />
        <View style={{ paddingHorizontal: 18, paddingTop: 26, gap: 14 }}>
          <Skeleton width="55%" height={22} radius={8} />
          <Skeleton width="100%" height={120} radius={16} />
        </View>
      </View>
    );
  }

  const isSelf = myId === parentId;
  const status = view.connectionStatus;
  const pendingInitiatedByMe = view.connectionInitiatedByMe === true;

  const openActions = () => {
    if (isSelf) { onSettings?.(); return; }
    const actions: Parameters<typeof Alert.alert>[2] = [
      { text: 'Cancel', style: 'cancel' },
      ...(status === 'connected' ? [{ text: 'Connection settings', onPress: () => router.push(`/connection-manage/${parentId}` as never) }] : []),
      { text: 'Report a concern', onPress: () => router.push(`/report/${parentId}` as never) },
      { text: 'Block parent', style: 'destructive', onPress: () => Alert.alert(
        `Block ${view.parent.display_name}?`,
        'They won’t be able to find you or see your activity.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => data.blockConnection(parentId).then(() => router.replace('/village?tab=blocked' as never)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not block this parent.')) },
        ],
      ) },
    ];
    Alert.alert(view.parent.display_name, 'Manage privacy and safety', actions);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          parent={view.parent}
          mutualFriendCount={view.mutualFriendCount}
          connectionStatus={status}
          isSelf={isSelf}
          onSettingsPress={openActions}
        />

        <View
          style={{
            backgroundColor: colors.cream,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingHorizontal: 18,
            paddingTop: 22,
            marginTop: -32,
          }}
        >
          {!isSelf ? (
            <ConnectCTA
              parent={view.parent}
              status={status}
              pendingInitiatedByMe={pendingInitiatedByMe}
              onConnect={async () => {
                await data.requestConnection(view.parent.id);
                load();
              }}
              onAccept={async () => {
                await data.acceptConnection(view.parent.id);
                load();
              }}
              onDecline={async () => {
                await data.declineConnection(view.parent.id);
                load();
              }}
            />
          ) : null}

          {view.parent.bio ? (
            <Text selectable style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: colors.brownMid, paddingTop: 18 }}>
              {view.parent.bio}
            </Text>
          ) : null}

          {view.kids.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <KidsGrid kids={view.kids} />
            </View>
          ) : isSelf ? (
            <View
              style={{
                marginTop: 22,
                borderWidth: 1.5,
                borderColor: colors.rule,
                borderStyle: 'dashed',
                borderRadius: 16,
                paddingVertical: 22,
                paddingHorizontal: 18,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 15,
                  color: colors.taupe,
                  textAlign: 'center',
                  lineHeight: 21,
                }}
              >
                your crew's polaroids will live here —{'\n'}add them in settings
              </Text>
            </View>
          ) : null}

          <ActivityChipsRow chips={view.activityChips} />

          {!isSelf ? (
            <PhoneSwapRow enabled={status === 'connected'} onPress={status === 'connected' ? () => router.push(`/connection-manage/${parentId}` as never) : undefined} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
