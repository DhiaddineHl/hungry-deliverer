import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/services/api/client';
import {
  getDriverByAccount,
  registerDriver,
  updateDriver,
  type DriverRegistration,
} from '@/services/api/driver-service';
import { driverKeys } from '@/services/api/query-keys';
import type { Driver, DriverInput } from '@/services/api/types';
import { useDriverStore } from '@/store/driver-store';

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

/** The driver record linked to a Keycloak account (`sub`), or `null`. */
export function useDriver(keycloakUserId: string | null | undefined) {
  return useQuery(driverQueryOptions(keycloakUserId));
}

/**
 * Self-registration: one backend call creates the Keycloak login, the Driver
 * entity and the Vehicle for the chosen class. On success the account ids are
 * persisted so pre-login screens can address the record, and the detail cache
 * is seeded with the response.
 */
export function useRegisterDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registration: DriverRegistration) => registerDriver(registration),
    onSuccess: (driver) => {
      if (driver.keycloakUserId) {
        useDriverStore.getState().setAccount({
          keycloakUserId: driver.keycloakUserId,
          driverId: driver.id,
          vehicleClass: driver.vehicle?.type ?? null,
        });
        queryClient.setQueryData(driverKeys.detail(driver.keycloakUserId), driver);
      }
    },
  });
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
