import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/constants';
import { ProfileBody } from '@/components/profile/ProfileBody';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';

export default function YouScreen() {
  const myId = useCurrentParentId();
  if (!myId) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={[]}>
      <ProfileBody
        parentId={myId}
        onSettings={() => {}}
      />
    </SafeAreaView>
  );
}
