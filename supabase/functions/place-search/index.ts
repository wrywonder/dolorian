import { createClient } from 'npm:@supabase/supabase-js@2';
import { createPlaceSearchHandler } from './handler.ts';

Deno.serve(createPlaceSearchHandler({
  apiKey: Deno.env.get('GOOGLE_MAPS_API_KEY'),
  fetch,
  authenticate: async (authorization) => {
    const scoped = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user }, error } = await scoped.auth.getUser();
    return Boolean(user && !error);
  },
}));
