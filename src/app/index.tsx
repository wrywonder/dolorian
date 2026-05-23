import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Root route — redirects to (auth) or (tabs) based on session state.
 *
 * We use <Redirect> (declarative) instead of router.replace() (imperative)
 * because expo-router guarantees the Redirect component fires after the
 * navigator is fully mounted, avoiding the race condition where
 * router.replace() is called before screens are registered.
 */
export default function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // While loading auth state, render nothing (splash screen is still visible).
  if (session === undefined) return null;

  if (session) {
    return <Redirect href="/(tabs)/buzz" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
