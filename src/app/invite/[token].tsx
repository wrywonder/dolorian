import { useLocalSearchParams } from 'expo-router';
import { InviteAcceptanceScreen } from '@/components/village/invite-acceptance-screen';
import { useSession } from '@/app/_layout';

export default function InviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useSession();
  if (!token) return null;
  return <InviteAcceptanceScreen reference={token} signedIn={Boolean(session)} />;
}
