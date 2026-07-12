import { create } from 'zustand';
import { data } from '@/lib/data';

/**
 * Single source of truth for "out & about" visibility. Both the Buzz
 * header and the IRL header read the same store, so toggling in one
 * updates the other immediately.
 *
 * `hydrate()` pulls the persisted value from parent_locations once per
 * sign-in (called from the tabs layout); toggles write through
 * optimistically and roll back if the write fails.
 */
type VisibilityState = {
  visible: boolean;
  hydrate: () => Promise<void>;
  setVisible: (next: boolean) => Promise<void>;
  toggle: () => Promise<void>;
};

export const useVisibilityStore = create<VisibilityState>((set, get) => ({
  visible: true,
  async hydrate() {
    try {
      const persisted = await data.getMyVisibility();
      if (persisted !== null) set({ visible: persisted });
    } catch {
      // not signed in yet or offline — keep the default until next toggle
    }
  },
  async setVisible(next) {
    const prev = get().visible;
    set({ visible: next });
    try {
      await data.setMyVisibility(next);
    } catch {
      set({ visible: prev });
    }
  },
  async toggle() {
    await get().setVisible(!get().visible);
  },
}));
