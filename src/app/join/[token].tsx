import { useLocalSearchParams } from 'expo-router';
import { InviteAcceptanceScreen } from '@/components/village/invite-acceptance-screen';
import { useSession } from '@/app/_layout';

export default function JoinRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useSession();
  if (!token) return null;
  return <InviteAcceptanceScreen key={`${token}:${session?.user.id ?? 'signed-out'}`} reference={token} signedIn={Boolean(session)} />;
}
