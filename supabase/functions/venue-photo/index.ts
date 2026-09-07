import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VenueRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  google_place_id: string | null;
  image_url: string | null;
  image_source: string | null;
  image_attribution: string | null;
  image_attribution_url: string | null;
};

type GoogleAttribution = {
  displayName?: string;
  uri?: string;
};

type GooglePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: GoogleAttribution[];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  photos?: GooglePhoto[];
};

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
    },
  });
}

async function googleJson<T>(url: string, apiKey: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Goog-Api-Key', apiKey);
  const response = await fetch(url, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return await response.json() as T;
}

function normalizedTokens(value: string): string[] {
  const ignored = new Set(['at', 'the', 'and', 'of', 'a', 'an']);
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ignored.has(token));
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(x));
}

function isConfidentMatch(venue: VenueRow, place: GooglePlace): boolean {
  const candidateName = place.displayName?.text;
  const candidateLat = place.location?.latitude;
  const candidateLng = place.location?.longitude;
  if (!candidateName || candidateLat === undefined || candidateLng === undefined) return false;
  if (distanceMeters(venue.lat, venue.lng, candidateLat, candidateLng) > 1_500) return false;

  const wanted = normalizedTokens(venue.name);
  const candidate = new Set(normalizedTokens(candidateName));
  if (wanted.length === 0) return false;
  const shared = wanted.filter((token) => candidate.has(token)).length;
  return shared / wanted.length >= 0.5;
}

function bestPhoto(photos: GooglePhoto[] | undefined): GooglePhoto | null {
  if (!photos?.length) return null;
  return [...photos]
    .filter((photo) => photo.name)
    .sort((a, b) => {
      const aRatio = (a.widthPx ?? 1) / Math.max(a.heightPx ?? 1, 1);
      const bRatio = (b.widthPx ?? 1) / Math.max(b.heightPx ?? 1, 1);
      const aLandscape = aRatio >= 1 ? 1 : 0;
      const bLandscape = bRatio >= 1 ? 1 : 0;
      if (aLandscape !== bLandscape) return bLandscape - aLandscape;
      return (b.widthPx ?? 0) - (a.widthPx ?? 0);
    })[0] ?? null;
}

async function resolvePlace(
  venue: VenueRow,
  apiKey: string,
): Promise<GooglePlace | null> {
  if (venue.google_place_id) {
    return await googleJson<GooglePlace>(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(venue.google_place_id)}`,
      apiKey,
      { headers: { 'X-Goog-FieldMask': 'id,displayName,location,googleMapsUri,photos' } },
    );
  }

  const result = await googleJson<{ places?: GooglePlace[] }>(
    'https://places.googleapis.com/v1/places:searchText',
    apiKey,
    {
      method: 'POST',
      headers: { 'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.googleMapsUri,places.photos' },
      body: JSON.stringify({
        textQuery: venue.name,
        locationBias: {
          circle: {
            center: { latitude: venue.lat, longitude: venue.lng },
            radius: 750,
          },
        },
        pageSize: 1,
      }),
    },
  );
  const candidate = result.places?.[0] ?? null;
  return candidate && isConfidentMatch(venue, candidate) ? candidate : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Not authenticated' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Backend configuration is incomplete' }, 500);
  }

  const scoped = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await scoped.auth.getUser();
  if (userError || !user) return json({ error: 'Not authenticated' }, 401);

  let venueId: string | undefined;
  try {
    const body = await request.json() as { venueId?: string };
    venueId = body.venueId;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!venueId || !/^[0-9a-f-]{36}$/i.test(venueId)) {
    return json({ error: 'A valid venueId is required' }, 400);
  }

  const { data, error } = await scoped
    .from('venues')
    .select('id, name, lat, lng, google_place_id, image_url, image_source, image_attribution, image_attribution_url')
    .eq('id', venueId)
    .single();
  if (error || !data) return json({ error: 'Venue not found' }, 404);
  const venue = data as VenueRow;

  // Persisted imagery is reserved for open-licensed or user-owned files.
  if (venue.image_url) {
    return json({
      uri: venue.image_url,
      source: venue.image_source,
      attribution: venue.image_attribution,
      attributionUrl: venue.image_attribution_url,
      cachePolicy: 'memory-disk',
    });
  }

  const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!googleKey) return json({ error: 'Venue photos are not configured' }, 503);

  try {
    const place = await resolvePlace(venue, googleKey);
    if (!place?.id) return json({ image: null });

    if (place.id !== venue.google_place_id) {
      const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      await admin.from('venues').update({ google_place_id: place.id }).eq('id', venue.id);
    }

    const photo = bestPhoto(place.photos);
    if (!photo?.name) return json({ image: null });

    const media = await googleJson<{ photoUri?: string }>(
      `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&skipHttpRedirect=true`,
      googleKey,
    );
    if (!media.photoUri) return json({ image: null });

    const authors = photo.authorAttributions ?? [];
    const authorNames = authors
      .map((author) => author.displayName?.trim())
      .filter((name): name is string => Boolean(name));

    return json({
      uri: media.photoUri,
      source: 'google_places',
      attribution: authorNames.length > 0 ? `Google · Photo by ${authorNames.join(', ')}` : 'Google',
      attributionUrl: authors.find((author) => author.uri)?.uri ?? place.googleMapsUri ?? null,
      cachePolicy: 'none',
    });
  } catch (cause) {
    console.error('venue-photo resolution failed', cause);
    return json({ error: 'Could not load a venue photo' }, 502);
  }
});
