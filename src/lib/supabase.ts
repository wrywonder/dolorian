import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const configuredAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const missingVariables = [
  !configuredUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !configuredAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
].filter((name): name is string => name !== null);

/**
 * Kept separate from the client so the root layout can render a useful error
 * screen instead of crashing during module evaluation.
 */
export const supabaseConfigError = missingVariables.length
  ? `Dolorian is missing ${missingVariables.join(' and ')}. Add them to .env for local development and to the selected EAS environment for builds.`
  : null;

// createClient requires a syntactically valid URL even when configuration is
// missing. The root layout prevents this inert client from making requests.
const url = configuredUrl ?? 'https://configuration.invalid';
const anonKey = configuredAnonKey ?? 'configuration-missing';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
