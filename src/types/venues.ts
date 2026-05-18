import type { Timestamp, UUID } from './common';

export type VenueType =
  | 'park'
  | 'playground'
  | 'studio'
  | 'swim'
  | 'library'
  | 'cafe'
  | 'school'
  | 'other';

export type Venue = {
  id: UUID;
  name: string;
  emoji: string | null;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  venue_type: VenueType;
};

export type LocationShareMode = 'none' | '30min' | 'until_leave';

export type ParentLocation = {
  id: UUID;
  parent_id: UUID;
  venue_id: UUID | null;
  visible: boolean;
  last_seen_at: Timestamp;
  expires_at: Timestamp | null;
};
