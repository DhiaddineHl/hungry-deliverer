import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { isApiError } from './client';

/**
 * App-wide QueryClient: a 1-minute default staleTime (profile-ish data,
 * overridden per query where volatility differs) and no retries on 4xx —
 * a 404 from the by-account lookup is an answer, not a hiccup.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

/**
 * React Query's focus-based refetching listens to browser events; on native
 * we forward AppState instead. Call once from the root layout.
 */
export function wireAppFocus(): () => void {
  const onChange = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  };
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}
