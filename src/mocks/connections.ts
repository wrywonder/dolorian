import type { Connection } from '@/types';
import { CONNECTION_IDS, PARENT_IDS } from './ids';

/**
 * Canonical-order helper: connections store (parent_a < parent_b) by string sort.
 * In production this is enforced by a CHECK constraint; here we just sort.
 */
function ordered(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

const [da, db] = ordered(PARENT_IDS.drew, PARENT_IDS.maya);
const [da2, db2] = ordered(PARENT_IDS.drew, PARENT_IDS.jordan);
const [da3, db3] = ordered(PARENT_IDS.drew, PARENT_IDS.priya);
const [da4, db4] = ordered(PARENT_IDS.drew, PARENT_IDS.sam);
const [ma, mb] = ordered(PARENT_IDS.maya, PARENT_IDS.jordan);
const [ma2, mb2] = ordered(PARENT_IDS.maya, PARENT_IDS.priya);

/**
 * Drew has 4 connections: Maya, Jordan, Priya, Sam.
 * Drew is NOT connected to Hannah — that's the pre-connection state
 * the You/profile design demos with the "Connect with Hannah" CTA.
 */
export const mockConnections: Connection[] = [
  {
    id: CONNECTION_IDS.drew_maya,
    parent_a: da,
    parent_b: db,
    status: 'connected',
    initiated_by: PARENT_IDS.maya,
    created_at: '2026-04-20T10:00:00Z',
    responded_at: '2026-04-20T15:30:00Z',
  },
  {
    id: CONNECTION_IDS.drew_jordan,
    parent_a: da2,
    parent_b: db2,
    status: 'connected',
    initiated_by: PARENT_IDS.drew,
    created_at: '2026-04-21T11:00:00Z',
    responded_at: '2026-04-21T18:00:00Z',
  },
  {
    id: CONNECTION_IDS.drew_priya,
    parent_a: da3,
    parent_b: db3,
    status: 'connected',
    initiated_by: PARENT_IDS.priya,
    created_at: '2026-04-22T09:00:00Z',
    responded_at: '2026-04-22T12:00:00Z',
  },
  {
    id: CONNECTION_IDS.drew_sam,
    parent_a: da4,
    parent_b: db4,
    status: 'connected',
    initiated_by: PARENT_IDS.drew,
    created_at: '2026-04-23T16:00:00Z',
    responded_at: '2026-04-24T08:00:00Z',
  },
  // Some non-Drew connections so the mutual-friends count on Hannah's profile
  // ("8 mutual friends" in the design — we'll fake-count visually)
  {
    id: CONNECTION_IDS.maya_jordan,
    parent_a: ma,
    parent_b: mb,
    status: 'connected',
    initiated_by: PARENT_IDS.maya,
    created_at: '2026-04-18T10:00:00Z',
    responded_at: '2026-04-18T14:00:00Z',
  },
  {
    id: CONNECTION_IDS.maya_priya,
    parent_a: ma2,
    parent_b: mb2,
    status: 'connected',
    initiated_by: PARENT_IDS.priya,
    created_at: '2026-04-19T10:00:00Z',
    responded_at: '2026-04-19T13:00:00Z',
  },
];
