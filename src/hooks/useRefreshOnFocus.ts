import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Refresh visible data on navigation and when returning from another app. */
export function useRefreshOnFocus(refresh: () => void, invalidate: () => void) {
  useFocusEffect(useCallback(() => {
    refresh();
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active') refresh();
      previousState = nextState;
    });
    return () => {
      subscription.remove();
      invalidate();
    };
  }, [refresh, invalidate]));
}
