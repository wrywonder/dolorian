import { Redirect } from 'expo-router';
import { useSession } from './_layout';

/**
 * Root route — redirects to (auth) or (tabs) based on session state.
 *
 * Session is already resolved by the root layout (which returns null until
 * fonts + session are ready), so we can read from AuthContext synchronously
 * here — no extra getSession() call, no race condition.
 */
export default function Index() {
  const { session } = useSession();

  if (session) {
    return <Redirect href="/(tabs)/buzz" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
