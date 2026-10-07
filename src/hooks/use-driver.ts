import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/services/api/client';
import { getDriverByAccount, updateDriver } from '@/services/api/driver-service';
import { driverKeys } from '@/services/api/query-keys';
import type { Driver, DriverInput } from '@/services/api/types';

/**
 * Shared query options for the driver-by-account fetch. Colocated so both
 * the `useDriver` hook and imperative prefetches (warming the cache right
 * after login in the auth context) resolve to the exact same cache entry and
 * the same 404-as-null behaviour.
 */
export function driverQueryOptions(keycloakUserId: string | null | undefined) {
  return {
    queryKey: driverKeys.detail(keycloakUserId ?? ''),
    queryFn: async (): Promise<Driver | null> => {
      try {
        return await getDriverByAccount(keycloakUserId!);
      } catch (error) {
        // The Keycloak account exists but has no driver record — e.g. a
        // Google sign-in that never completed registration.
        if (isApiError(error, 404)) return null;
        throw error;
      }
    },
    enabled: !!keycloakUserId,
    // Profile data rarely changes outside this device's own mutations.
    staleTime: 5 * 60 * 1000,
  };
}

/**
 * Warms the cache with the driver record behind the logged-in account.
 *
 * It used to create a record (`POST /drivers/me`) for an account that had
 * none — the normal state of a Google sign-in — but that let anyone with a
 * Google account become a deliverer without applying. A Driver row now only
 * ever comes from an approved application, so an account without one is
 * simply answered with `null`, and the auth context refuses that session.
 */
export async function loadDriverForAccount(
  queryClient: QueryClient,
  keycloakUserId: string
): Promise<Driver | null> {
  return queryClient.fetchQuery(driverQueryOptions(keycloakUserId));
}

/** The driver record linked to a Keycloak account (`sub`), or `null`. */
export function useDriver(keycloakUserId: string | null | undefined) {
  return useQuery(driverQueryOptions(keycloakUserId));
}

/** Generic partial update of the driver record (resolved by `code`). */
export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DriverInput) => updateDriver(input),
    onSuccess: (driver) => {
      if (driver.keycloakUserId) {
        queryClient.setQueryData(driverKeys.detail(driver.keycloakUserId), driver);
      }
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}
