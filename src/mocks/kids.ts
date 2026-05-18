import type { Kid } from '@/types';
import { KID_IDS, PARENT_IDS } from './ids';

/** Current year for "X yrs" age math is 2026 in this beta. */
export const mockKids: Kid[] = [
  // Drew's family
  {
    id: KID_IDS.drew_sasha,
    parent_id: PARENT_IDS.drew,
    name: 'Sasha',
    birth_year: 2021,
    interests: ['soccer', 'painting'],
    created_at: '2026-04-10T18:32:00Z',
  },
  {
    id: KID_IDS.drew_eli,
    parent_id: PARENT_IDS.drew,
    name: 'Eli',
    birth_year: 2023,
    interests: ['music', 'puzzles'],
    created_at: '2026-04-10T18:32:00Z',
  },
  // Maya's family
  {
    id: KID_IDS.maya_theo,
    parent_id: PARENT_IDS.maya,
    name: 'Theo',
    birth_year: 2021,
    interests: ['soccer', 'dinosaurs'],
    created_at: '2026-04-11T09:15:00Z',
  },
  // Jordan's family
  {
    id: KID_IDS.jordan_felix,
    parent_id: PARENT_IDS.jordan,
    name: 'Felix',
    birth_year: 2023,
    interests: ['climbing', 'tumbling'],
    created_at: '2026-04-12T14:20:00Z',
  },
  {
    id: KID_IDS.jordan_nora,
    parent_id: PARENT_IDS.jordan,
    name: 'Nora',
    birth_year: 2020,
    interests: ['storytime', 'drawing'],
    created_at: '2026-04-12T14:20:00Z',
  },
  // Hannah's family
  {
    id: KID_IDS.hannah_asha,
    parent_id: PARENT_IDS.hannah,
    name: 'Asha',
    birth_year: 2020,
    interests: ['ballet', 'reading'],
    created_at: '2026-04-13T11:00:00Z',
  },
  {
    id: KID_IDS.hannah_leo,
    parent_id: PARENT_IDS.hannah,
    name: 'Leo',
    birth_year: 2023,
    interests: ['blocks', 'park'],
    created_at: '2026-04-13T11:00:00Z',
  },
  // Priya's family
  {
    id: KID_IDS.priya_aiden,
    parent_id: PARENT_IDS.priya,
    name: 'Aiden',
    birth_year: 2022,
    interests: ['swim', 'trucks'],
    created_at: '2026-04-14T16:45:00Z',
  },
  {
    id: KID_IDS.priya_zoe,
    parent_id: PARENT_IDS.priya,
    name: 'Zoe',
    birth_year: 2019,
    interests: ['piano', 'soccer'],
    created_at: '2026-04-14T16:45:00Z',
  },
  // Sam's family
  {
    id: KID_IDS.sam_kai,
    parent_id: PARENT_IDS.sam,
    name: 'Kai',
    birth_year: 2018,
    interests: ['piano', 'hiking'],
    created_at: '2026-04-15T08:00:00Z',
  },
];
