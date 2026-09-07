import { supabase } from '@/lib/supabase';
import type { Venue } from '@/types';

export type VenuePhoto = {
  uri: string;
  source: string | null;
  attribution: string | null;
  attributionUrl: string | null;
  cachePolicy: 'none' | 'memory-disk';
};

const inFlight = new Map<string, Promise<VenuePhoto | null>>();

function absoluteUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('//')) return `https:${value}`;
  return value.startsWith('https://') ? value : null;
}

function persistedPhoto(venue: Venue): VenuePhoto | null {
  const uri = absoluteUrl(venue.image_url);
  if (!uri) return null;
  return {
    uri,
    source: venue.image_source,
    attribution: venue.image_attribution,
    attributionUrl: absoluteUrl(venue.image_attribution_url),
    cachePolicy: 'memory-disk',
  };
}

/**
 * Resolves a venue photo for the current display session. Open-licensed images
 * may use the device cache; Google Places photos are returned ephemerally by
 * the Edge Function and explicitly rendered without image caching.
 */
async function resolveRemotePhoto(venue: Venue): Promise<VenuePhoto | null> {
  const existing = inFlight.get(venue.id);
  if (existing) return existing;

  const request = invokeVenuePhoto(venue).finally(() => inFlight.delete(venue.id));
  inFlight.set(venue.id, request);
  return request;
}

async function invokeVenuePhoto(venue: Venue): Promise<VenuePhoto | null> {
  const { data, error } = await supabase.functions.invoke('venue-photo', {
    body: { venueId: venue.id },
  });
  if (error || !data || typeof data !== 'object') return null;

  const raw = data as Record<string, unknown>;
  const uri = absoluteUrl(typeof raw.uri === 'string' ? raw.uri : null);
  if (!uri) return null;
  return {
    uri,
    source: typeof raw.source === 'string' ? raw.source : null,
    attribution: typeof raw.attribution === 'string' ? raw.attribution : null,
    attributionUrl: absoluteUrl(typeof raw.attributionUrl === 'string' ? raw.attributionUrl : null),
    cachePolicy: raw.cachePolicy === 'none' ? 'none' : 'memory-disk',
  };
}

export async function getVenuePhoto(venue: Venue): Promise<VenuePhoto | null> {
  const stored = persistedPhoto(venue);
  if (stored) return stored;
  return resolveRemotePhoto(venue);
}
