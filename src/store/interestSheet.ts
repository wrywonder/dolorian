import { create } from 'zustand';
import type { InteractionState, UUID } from '@/types';

/**
 * Imperative API for the Interested / Going action sheet.
 * Any screen calls `present({...})`; the host in (tabs)/_layout renders.
 *
 * Cleaner than prop-drilling a Modal through every card.
 */
export type InterestSheetPayload = {
  activityId: UUID;
  activityName: string;
  emoji: string | null;
  currentState: InteractionState | null;
  onChanged: (next: InteractionState | null) => void;
};

type InterestSheetState = {
  payload: InterestSheetPayload | null;
  present: (payload: InterestSheetPayload) => void;
  dismiss: () => void;
};

export const useInterestSheet = create<InterestSheetState>((set) => ({
  payload: null,
  present: (payload) => set({ payload }),
  dismiss: () => set({ payload: null }),
}));
