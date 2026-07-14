import { createContext, useContext, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { colors, fonts } from '@/lib/constants';

SplashScreen.preventAutoHideAsync();

/** Shared auth context so index.tsx (and other screens) can read session state. */
const AuthContext = createContext<{ session: Session | null | undefined }>({
  session: undefined,
});
export const useSession = () => useContext(AuthContext);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (supabaseConfigError) {
      setSession(null);
      return;
    }
    // Subscribe first so we don't miss events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    // Also call getSession() explicitly so that if onAuthStateChange doesn't
    // fire an INITIAL_SESSION event we still resolve session state.
    supabase.auth.getSession().then(({ data }) => {
      // Only apply if onAuthStateChange hasn't already resolved session.
      setSession((prev) => (prev === undefined ? data.session ?? null : prev));
    });
    return () => subscription.unsubscribe();
  }, []);

  const ready = (fontsLoaded || fontError) && session !== undefined;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (supabaseConfigError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.cream,
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.monoBold,
            fontSize: 11,
            letterSpacing: 0.7,
            color: colors.terracotta,
            marginBottom: 10,
          }}
        >
          SETUP NEEDED
        </Text>
        <Text
          style={{
            fontFamily: fonts.serifRegular,
            fontSize: 32,
            lineHeight: 36,
            color: colors.dark,
            marginBottom: 14,
          }}
        >
          Dolorian can’t reach its backend yet.
        </Text>
        <Text
          selectable
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            lineHeight: 21,
            color: colors.brownMid,
          }}
        >
          {supabaseConfigError}
        </Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ session }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthContext.Provider>
  );
}
