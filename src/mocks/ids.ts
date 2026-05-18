/**
 * Stable UUIDs for mock fixtures. Pattern: 00000000-0000-4000-8000-<purpose>.
 * Using readable hex tails so logs are scannable during development.
 */

export const PARENT_IDS = {
  drew: '00000000-0000-4000-8000-00000000d4ew', // current beta user
  maya: '00000000-0000-4000-8000-0000000ma4y4',
  jordan: '00000000-0000-4000-8000-000000j0rd4n',
  hannah: '00000000-0000-4000-8000-0000000h4nn4',
  priya: '00000000-0000-4000-8000-0000000pr1y4',
  sam: '00000000-0000-4000-8000-000000000s4m',
} as const;

export const KID_IDS = {
  drew_sasha: 'kid-00000000-0000-4000-8000-d4ew-s4sh4',
  drew_eli: 'kid-00000000-0000-4000-8000-d4ew-eli0',
  maya_theo: 'kid-00000000-0000-4000-8000-ma4y4-the0',
  jordan_felix: 'kid-00000000-0000-4000-8000-j0rd4n-fx',
  jordan_nora: 'kid-00000000-0000-4000-8000-j0rd4n-nor',
  hannah_asha: 'kid-00000000-0000-4000-8000-h4nn4-4sh4',
  hannah_leo: 'kid-00000000-0000-4000-8000-h4nn4-le0o',
  priya_aiden: 'kid-00000000-0000-4000-8000-pr1y4-4dn0',
  priya_zoe: 'kid-00000000-0000-4000-8000-pr1y4-z0e0',
  sam_kai: 'kid-00000000-0000-4000-8000-00s4m-k4i0',
} as const;

export const VENUE_IDS = {
  cesar_chavez: 'venue-cesar-chavez-park',
  studio_growlies: 'venue-studio-growlies',
  albany_aquatic: 'venue-albany-aquatic',
  tilden_park: 'venue-tilden-park',
} as const;

export const ACTIVITY_IDS = {
  saturday_soccer: 'act-saturday-soccer-may24',
  wildcat_hike: 'act-wildcat-hike-may25',
  ten_thirty_ballet: 'act-1030-ballet-may24',
  storytime: 'act-albany-storytime-discovered',
  spring_concert: 'act-spring-concert-imported',
  birthday_playdate: 'act-drew-birthday-playdate',
} as const;

export const CONNECTION_IDS = {
  drew_maya: 'conn-drew-maya',
  drew_jordan: 'conn-drew-jordan',
  drew_priya: 'conn-drew-priya',
  drew_sam: 'conn-drew-sam',
  maya_jordan: 'conn-maya-jordan',
  maya_priya: 'conn-maya-priya',
} as const;

export const POST_IDS = {
  maya_first_goal: 'post-maya-first-goal',
  jordan_tumbling: 'post-jordan-tumbling-q',
  priya_ballet_pickup: 'post-priya-ballet-pickup',
  sam_sunday_hike_q: 'post-sam-sunday-hike-q',
  maya_carpool_q: 'post-maya-carpool-q',
  jordan_felix_park: 'post-jordan-felix-park',
  priya_swim_class: 'post-priya-swim-class',
  sam_kai_recital: 'post-sam-kai-recital',
} as const;

export const PROMPT_IDS = {
  drew_ballet_share: 'prompt-drew-ballet-share',
} as const;

export const CALENDAR_EVENT_IDS = {
  drew_spring_concert: 'calev-drew-spring-concert',
} as const;

export const LOCATION_IDS = {
  maya_at_cesar: 'loc-maya-cesar',
  priya_at_studio: 'loc-priya-studio',
  sam_at_studio: 'loc-sam-studio',
  drew_at_tilden: 'loc-drew-tilden',
} as const;

/** The current beta user — Drew Rowny. */
export const CURRENT_PARENT_ID = PARENT_IDS.drew;
