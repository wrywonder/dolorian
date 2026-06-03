import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import { Icon } from '@/components/ui';
import type { ProfileView, UUID } from '@/types';
import { ActivityChipsRow } from './ActivityChipsRow';
import { ConnectCTA } from './ConnectCTA';
import { KidsGrid } from './KidsGrid';
import { PhoneSwapRow } from './PhoneSwapRow';
import { ProfileHeader } from './ProfileHeader';
import { RequestsInbox } from './RequestsInbox';
import { OutgoingRequests } from './OutgoingRequests';

type ProfileBodyProps = {
  parentId: UUID;
  onSettings?: () => void;
};

export function ProfileBody({ parentId, onSettings }: ProfileBodyProps) {
  const myId = useCurrentParentId();
  const [view, setView] = useState<ProfileView | null>(null);

  const load = useCallback(async () => {
    const result = await data.getProfile(parentId);
    setView(result);
  }, [parentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!view) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const isSelf = myId === parentId;
  const status = view.connectionStatus;
  const pendingInitiatedByMe = status === 'pending';

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
          onSettingsPress={onSettings}
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
            />
          ) : (
            <>
              <RequestsInbox onChanged={load} />
              <OutgoingRequests />
              <Pressable
                onPress={() => router.push('/invite')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: colors.terracotta,
                  backgroundColor: colors.surface,
                }}
              >
                <Icon name="plus.circle" size={18} color={colors.terracotta} weight={2.2} />
                <Text style={{ fontFamily: fonts.sansExtra, fontSize: 14.5, color: colors.terracotta }}>
                  invite a parent
                </Text>
              </Pressable>
            </>
          )}

          <View style={{ marginTop: 22 }}>
            <KidsGrid kids={view.kids} />
          </View>

          <ActivityChipsRow chips={view.activityChips} />

          {!isSelf ? (
            <PhoneSwapRow enabled={status === 'connected'} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
