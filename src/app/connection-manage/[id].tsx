import { useLocalSearchParams } from 'expo-router';
import { ConnectionManageScreen } from '@/components/village/connection-manage-screen';

export default function ConnectionManageRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <ConnectionManageScreen parentId={id} />;
}
