// No database writes: only authenticated, bounded requests to Places API (New).
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
type Services = { authenticate: (authorization: string) => Promise<boolean>; apiKey: string | undefined; fetch: typeof fetch };
type Prediction = { placePrediction?: { placeId?: string; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } };

export function createPlaceSearchHandler(services: Services) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Not authenticated' }, 401);
    try {
      if (!await services.authenticate(authorization)) return json({ error: 'Not authenticated' }, 401);
    } catch { return json({ error: 'Could not verify your session' }, 503); }
    let body: { query?: unknown; placeId?: unknown; sessionToken?: unknown };
    try {
      const raw = await request.text();
      if (raw.length > 4096) return json({ error: 'Request is too large' }, 413);
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      body = parsed;
    } catch { return json({ error: 'Invalid JSON body' }, 400); }
    const { query, placeId, sessionToken } = body;
    if (typeof sessionToken !== 'string' || !/^[a-zA-Z0-9_-]{16,36}$/.test(sessionToken)) return json({ error: 'Invalid search session' }, 400);
    if (placeId !== undefined ? typeof placeId !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(placeId) || query !== undefined : typeof query !== 'string' || query.trim().length < 2 || query.length > 200) {
      return json({ error: 'Enter a place name or address' }, 400);
    }
    if (!services.apiKey) return json({ error: 'Place search is unavailable' }, 503);
    try {
      const details = typeof placeId === 'string';
      const response = await services.fetch(details
        ? `https://places.googleapis.com/v1/places/${placeId}?sessionToken=${encodeURIComponent(sessionToken)}`
        : 'https://places.googleapis.com/v1/places:autocomplete', {
        method: details ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': services.apiKey,
          'X-Goog-FieldMask': details ? 'id,displayName,formattedAddress' : 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat' },
        ...(details ? {} : { body: JSON.stringify({ input: (query as string).trim(), sessionToken }) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Provider unavailable');
      if (details) {
        const place = await response.json() as { id?: string; displayName?: { text?: string }; formattedAddress?: string };
        if (place.id !== placeId || !place.displayName?.text || !place.formattedAddress) throw new Error('Incomplete place');
        return json({ place: { id: place.id, name: place.displayName.text, address: place.formattedAddress } });
      }
      const result = await response.json() as { suggestions?: Prediction[] };
      if (result.suggestions !== undefined && !Array.isArray(result.suggestions)) throw new Error('Invalid suggestions');
      const suggestions = (result.suggestions ?? []).flatMap(({ placePrediction: place }) => {
        const name = place?.structuredFormat?.mainText?.text;
        return place?.placeId && name ? [{ id: place.placeId, name, address: place.structuredFormat?.secondaryText?.text ?? '' }] : [];
      }).slice(0, 5);
      return json({ suggestions });
    } catch { return json({ error: 'Could not search places. Try again or enter the place yourself.' }, 502); }
  };
}
