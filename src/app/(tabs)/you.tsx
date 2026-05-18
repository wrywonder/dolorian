import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/constants';
import { ProfileBody } from '@/components/profile/ProfileBody';
import { CURRENT_PARENT_ID } from '@/mocks/ids';

/**
 * You tab — your own profile. ProfileBody hides the Connect CTA and
 * phone-swap row when isSelf; the gear icon opens settings (Phase 7+).
 */
export default function YouScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={[]}>
      <ProfileBody
        parentId={CURRENT_PARENT_ID}
        onSettings={() => {
          // Phase 7 opens the settings sheet (calendar connection, sign out).
        }}
      />
    </SafeAreaView>
  );
}
