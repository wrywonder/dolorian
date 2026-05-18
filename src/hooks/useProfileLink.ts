import { useRouter } from 'expo-router';
import { CURRENT_PARENT_ID } from '@/mocks/ids';
import type { UUID } from '@/types';

/**
 * Tap-an-avatar navigation. Routes to /profile/<id> for other parents
 * and to /(tabs)/you when the id matches the current user — so the You
 * tab is the canonical view of your own profile, not /profile/<self>.
 */
export function useProfileLink() {
  const router = useRouter();
  return (parentId: UUID) => {
    if (parentId === CURRENT_PARENT_ID) {
      router.push('/(tabs)/you' as never);
    } else {
      router.push(`/profile/${parentId}` as never);
    }
  };
}
