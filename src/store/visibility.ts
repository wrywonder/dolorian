import { create } from 'zustand';
import { data } from '@/lib/data';
import type { VisibilityMode } from '@/types';

type VisibilityState = {
  mode: VisibilityMode;
  visible: boolean;
  hydrate: () => Promise<void>;
  setMode: (next: VisibilityMode) => Promise<void>;
  toggle: () => Promise<void>;
};

export const useVisibilityStore = create<VisibilityState>((set, get) => ({
  mode: 'auto',
  visible: false,
  async hydrate() {
    try {
      const persisted = await data.getMyVisibility();
      set(persisted);
    } catch {
      // Keep the privacy-safe local default until auth/network is ready.
    }
  },
  async setMode(next) {
    const previous = { mode: get().mode, visible: get().visible };
    set({ mode: next, visible: next === 'disabled' ? false : get().visible });
    try {
      await data.setVisibilityMode(next);
      await get().hydrate();
    } catch (error) {
      set(previous);
      throw error;
    }
  },
  async toggle() {
    const next: VisibilityMode = get().mode === 'disabled' ? 'auto' : 'disabled';
    await get().setMode(next);
  },
}));
