import { create } from 'zustand';
import { data } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { createPresenceIdentityGuard, isPresenceVisible, type MyPresence } from '@/lib/irl-presence';
import { cancelPendingHangoutNotifications } from '@/lib/hangout-geofencing';
import type { VisibilityMode } from '@/types';

type VisibilityState = MyPresence & {
  saving: boolean;
  captureIdentity: () => () => boolean;
  hydrate: () => Promise<void>;
  accept: (presence: MyPresence) => void;
  tick: () => void;
  setMode: (next: VisibilityMode) => Promise<void>;
  toggle: () => Promise<void>;
};

let revision = 0;
const identityGuard = createPresenceIdentityGuard();

export const useVisibilityStore = create<VisibilityState>((set, get) => ({
  mode: 'auto',
  visible: false,
  location: null,
  venue: null,
  saving: false,
  captureIdentity() {
    return identityGuard.capture();
  },
  accept(presence) {
    revision += 1;
    set(presence);
  },
  tick() {
    set({ visible: isPresenceVisible(get().location) });
  },
  async hydrate() {
    const request = ++revision;
    try {
      const persisted = await data.getMyVisibility();
      if (request === revision) set(persisted);
    } catch {
      // Preserve verified state during a failed refresh; expiry still applies.
      get().tick();
    }
  },
  async setMode(next) {
    if (get().saving) return;
    revision += 1;
    const isSameIdentity = identityGuard.capture();
    set({ saving: true });
    try {
      await data.setVisibilityMode(next);
      if (!isSameIdentity()) return;
      if (next === 'disabled') {
        await cancelPendingHangoutNotifications().catch((cause) => console.warn('could not clear arrival reminders', cause));
      }
      const persisted = await data.getMyVisibility();
      if (isSameIdentity()) get().accept(persisted);
    } catch (error) {
      // A multi-request write can partly succeed. Read back the persisted mode.
      if (isSameIdentity()) await get().hydrate();
      throw error;
    } finally {
      if (isSameIdentity()) set({ saving: false });
    }
  },
  async toggle() {
    const next: VisibilityMode = get().mode === 'disabled' ? 'auto' : 'disabled';
    await get().setMode(next);
  },
}));

// This store outlives the tab navigator. Never carry one account's venue into
// another account, including when its first refresh fails. Token refreshes for
// the same user keep current state; an actual identity change invalidates reads.
supabase.auth.onAuthStateChange((_event, session) => {
  const nextUserId = session?.user.id ?? null;
  if (!identityGuard.update(nextUserId)) return;
  revision += 1;
  useVisibilityStore.setState({ mode: 'auto', visible: false, location: null, venue: null, saving: false });
});
