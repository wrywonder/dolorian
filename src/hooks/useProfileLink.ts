import { useRouter } from 'expo-router';
import { useCurrentParentId } from './useCurrentParentId';
import type { UUID } from '@/types';

export function useProfileLink() {
  const router = useRouter();
  const myId = useCurrentParentId();
  return (parentId: UUID) => {
    if (myId && parentId === myId) {
      router.push('/(tabs)/you' as never);
    } else {
      router.push(`/profile/${parentId}` as never);
    }
  };
}
