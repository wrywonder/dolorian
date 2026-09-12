import type { ParentLocation, Venue, VisibilityMode } from '../types/index.ts';

export const VISIT_DURATION_MS = 2 * 60 * 60 * 1000;
export const AUTO_SHARE_DELAY_MS = 5 * 60 * 1000;

/** A device registration grants automatic sharing only to the parent who enabled it. */
export function isHangoutMonitoringOwner(registeredParentId: string | null, currentParentId: string | null): boolean {
  return Boolean(currentParentId && registeredParentId === currentParentId);
}

/** Old regions remain unauthorized until their replacement succeeds for the same account. */
export async function replaceOwnedHangoutMonitoring(actions: {
  clearOwner: () => Promise<void>;
  isSameAccount: () => Promise<boolean>;
  replaceRegions: () => Promise<void>;
  claimOwner: () => Promise<void>;
}): Promise<void> {
  if (!await actions.isSameAccount()) throw new Error('Your account changed. Please set up sharing again.');
  await actions.clearOwner();
  try {
    if (!await actions.isSameAccount()) throw new Error('Your account changed. Please set up sharing again.');
    await actions.replaceRegions();
    if (!await actions.isSameAccount()) throw new Error('Your account changed. Please set up sharing again.');
    await actions.claimOwner();
  } catch (cause) {
    await actions.clearOwner().catch(() => {});
    throw cause;
  }
}

export type MyPresence = {
  mode: VisibilityMode;
  visible: boolean;
  location: ParentLocation | null;
  venue: Venue | null;
};

export function hasActiveVisit(
  location: Pick<ParentLocation, 'venue_id' | 'expires_at'> | null | undefined,
  now = Date.now(),
): boolean {
  return Boolean(location?.venue_id && location.expires_at && Date.parse(location.expires_at) > now);
}

export function isPresenceVisible(
  location: Pick<ParentLocation, 'venue_id' | 'visible' | 'expires_at' | 'auto_share_at'> | null | undefined,
  now = Date.now(),
): boolean {
  return hasActiveVisit(location, now) && Boolean(
    location?.visible || (location?.auto_share_at && Date.parse(location.auto_share_at) <= now),
  );
}

export function visitTimes(now = Date.now(), automatic = false) {
  return {
    last_seen_at: new Date(now).toISOString(),
    expires_at: new Date(now + VISIT_DURATION_MS).toISOString(),
    auto_share_at: automatic ? new Date(now + AUTO_SHARE_DELAY_MS).toISOString() : null,
  };
}

/** Serialize arrival, manual share, stop and mode changes on this device. */
export function createPresenceQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation, operation);
    pending = result.catch(() => {});
    return result;
  };
}

/** Invalidate async presence work when the account changes, not on token refresh. */
export function createPresenceIdentityGuard() {
  let userId: string | null | undefined;
  let revision = 0;
  return {
    update(nextUserId: string | null): boolean {
      if (nextUserId === userId) return false;
      userId = nextUserId;
      revision += 1;
      return true;
    },
    capture(): () => boolean {
      const current = revision;
      return () => current === revision;
    },
  };
}

/** A failed warning must never leave a future location share armed. */
export async function startWarnedVisit<T>(
  warn: () => Promise<void>,
  start: () => Promise<T>,
  cancelWarning: () => Promise<void>,
): Promise<T> {
  await warn();
  try {
    return await start();
  } catch (cause) {
    await cancelWarning().catch(() => {});
    throw cause;
  }
}
