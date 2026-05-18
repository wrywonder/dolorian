/**
 * Root route — redirects to the Buzz tab. Phase 7 adds an auth check
 * that redirects unauthenticated users to /auth/sign-in instead.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/buzz" />;
}
