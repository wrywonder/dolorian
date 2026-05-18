import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { colors } from '@/lib/constants';
import { data } from '@/lib/data';
import { CURRENT_PARENT_ID } from '@/mocks/ids';
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

/**
 * Shared profile renderer used by both the You tab (own profile) and
 * the /profile/[id] route (viewing another parent).
 */
export function ProfileBody({ parentId, onSettings }: ProfileBodyProps) {
  const [view, setView] = useState<ProfileView | null>(null);

  const load = useCallback(async () => {
    const result = await data.getProfile(parentId);
    setView(result);
  }, [parentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!view) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const isSelf = parentId === CURRENT_PARENT_ID;
  const status = view.connectionStatus;
  // In Phase 7 we'll query the actual `initiated_by` on the connection row.
  // For now, mocks only allow Drew to initiate from this screen, so any
  // pending row we see was initiated by us.
  const pendingInitiatedByMe = status === 'pending';

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          parent={view.parent}
          mutualFriendCount={view.mutualFriendCount || (isSelf ? 0 : 8)}
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
          ) : null}

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
