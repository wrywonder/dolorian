import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from './_layout';
import { accountDestination, friendlyAuthError, parentProfileExists } from '@/lib/auth-flow';
import { colors, fonts } from '@/lib/constants';

/**
 * Root route — redirects to (auth) or (tabs) based on session state.
 *
 * Session is already resolved by the root layout (which returns null until
 * fonts + session are ready), so we can read from AuthContext synchronously
 * here — no extra getSession() call, no race condition.
 */
export default function Index() {
  const { session } = useSession();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkProfile = useCallback(async () => {
    if (!session?.user) return;
    setHasProfile(null);
    setError(null);
    try {
      setHasProfile(await parentProfileExists(session.user.id));
    } catch (cause) {
      setError(friendlyAuthError(cause, 'Village could not check your profile.'));
    }
  }, [session?.user]);

  useEffect(() => { void checkProfile(); }, [checkProfile]);

  if (session) {
    if (error) {
      return (
        <View style={{ flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.cream }}>
          <Text selectable style={{ fontFamily: fonts.serifRegular, fontSize: 27, textAlign: 'center', color: colors.dark }}>we couldn’t open your profile</Text>
          <Text selectable style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.taupe }}>{error}</Text>
          <Pressable onPress={checkProfile} style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18, backgroundColor: colors.terracotta }}>
            <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.white }}>try again</Text>
          </Pressable>
        </View>
      );
    }
    if (hasProfile === null) {
      return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}><ActivityIndicator color={colors.terracotta} /></View>;
    }
    return <Redirect href={accountDestination(hasProfile) as never} />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
