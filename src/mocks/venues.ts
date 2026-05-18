import type { ParentLocation, Venue } from '@/types';
import { LOCATION_IDS, PARENT_IDS, VENUE_IDS } from './ids';

export const mockVenues: Venue[] = [
  {
    id: VENUE_IDS.cesar_chavez,
    name: 'Cesar Chavez Park',
    emoji: '🌳',
    lat: 37.8642,
    lng: -122.3094,
    geofence_radius_m: 120,
    venue_type: 'park',
  },
  {
    id: VENUE_IDS.studio_growlies,
    name: 'Studio Growlies',
    emoji: '🩰',
    lat: 37.8773,
    lng: -122.2728,
    geofence_radius_m: 50,
    venue_type: 'studio',
  },
  {
    id: VENUE_IDS.albany_aquatic,
    name: 'Albany Aquatic',
    emoji: '🏊',
    lat: 37.8856,
    lng: -122.2953,
    geofence_radius_m: 60,
    venue_type: 'swim',
  },
  {
    id: VENUE_IDS.tilden_park,
    name: 'Tilden Park',
    emoji: '🥾',
    lat: 37.8911,
    lng: -122.2453,
    geofence_radius_m: 200,
    venue_type: 'park',
  },
];

/**
 * Active locations — drives the IRL map pins. The design shows
 * Maya at Cesar Chavez, Priya + Sam at Studio Growlies, and Drew at
 * Tilden ("you" pin). That's 4 active rows.
 */
export const mockParentLocations: ParentLocation[] = [
  {
    id: LOCATION_IDS.maya_at_cesar,
    parent_id: PARENT_IDS.maya,
    venue_id: VENUE_IDS.cesar_chavez,
    visible: true,
    last_seen_at: '2026-05-24T10:48:00Z',
    expires_at: '2026-05-24T12:48:00Z',
  },
  {
    id: LOCATION_IDS.priya_at_studio,
    parent_id: PARENT_IDS.priya,
    venue_id: VENUE_IDS.studio_growlies,
    visible: true,
    last_seen_at: '2026-05-24T10:35:00Z',
    expires_at: '2026-05-24T11:30:00Z',
  },
  {
    id: LOCATION_IDS.sam_at_studio,
    parent_id: PARENT_IDS.sam,
    venue_id: VENUE_IDS.studio_growlies,
    visible: true,
    last_seen_at: '2026-05-24T10:36:00Z',
    expires_at: '2026-05-24T11:30:00Z',
  },
  {
    id: LOCATION_IDS.drew_at_tilden,
    parent_id: PARENT_IDS.drew,
    venue_id: VENUE_IDS.tilden_park,
    visible: true,
    last_seen_at: '2026-05-24T10:55:00Z',
    expires_at: '2026-05-24T12:55:00Z',
  },
];
