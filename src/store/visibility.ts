import { create } from 'zustand';
import { data } from '@/lib/data';

/**
 * Single source of truth for "out & about" visibility. Both the Buzz
 * header and the IRL header read the same store, so toggling in one
 * updates the other immediately.
 *
 * Phase 7 will hydrate `visible` from parent_locations on app start
 * and write through to Supabase Realtime here.
 */
type VisibilityState = {
  visible: boolean;
  setVisible: (next: boolean) => Promise<void>;
  toggle: () => Promise<void>;
};

export const useVisibilityStore = create<VisibilityState>((set, get) => ({
  visible: true,
  async setVisible(next) {
    set({ visible: next });
    await data.setMyVisibility(next);
  },
  async toggle() {
    await get().setVisible(!get().visible);
  },
}));
