import { supabase } from './supabase';

export type PlaceSuggestion = { id: string; name: string; address: string };
async function request(body: { sessionToken: string; query?: string; placeId?: string }, signal: AbortSignal) {
  const { data, error } = await supabase.functions.invoke<{ suggestions?: PlaceSuggestion[]; place?: PlaceSuggestion }>('place-search', { body, signal, timeout: 12000 });
  if (error || !data) throw new Error('Place search couldn’t connect. Try again, or enter the place yourself.');
  return data;
}
export async function searchPlaces(query: string, sessionToken: string, signal: AbortSignal) {
  const result = await request({ query, sessionToken }, signal);
  if (!Array.isArray(result.suggestions)) throw new Error('Could not load suggestions. You can enter the place yourself.');
  return result.suggestions;
}
export async function getPlaceDetails(placeId: string, sessionToken: string, signal: AbortSignal) {
  const result = await request({ placeId, sessionToken }, signal);
  if (!result.place?.name || !result.place.address) throw new Error('Could not load that address. Try again or enter it yourself.');
  return result.place;
}
