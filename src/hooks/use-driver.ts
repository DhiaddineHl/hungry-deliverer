import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/services/api/client';
import {
  createDriverForAccount,
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

/**
 * Guarantees the logged-in account has a driver record, and seeds the cache
 * with it.
 *
 * Accounts created by in-app registration already have one (the backend writes
 * the Keycloak user, the Driver and the Vehicle in a single transaction).
 * Accounts created by Keycloak itself — a Google sign-in, brokered by Keycloak
 * — do not: nothing ever called `POST /drivers` for them, and it would answer
 * 409 if it did, because that endpoint always provisions a new Keycloak user.
 * `POST /drivers/me` fills that gap and is idempotent, so this is safe to run
 * after every login and session restore, including for accounts that predate
 * it.
 *
 * The record it creates carries no vehicle class, so the deliverer stays
 * PENDING_APPROVAL and undispatchable until one is set (`useUpdateDriver`) or
 * the back-office approves them — the same gate every self-registered
 * deliverer passes through.
 */
export async function ensureDriverForAccount(
  queryClient: QueryClient,
  keycloakUserId: string
): Promise<Driver | null> {
  const existing = await queryClient.fetchQuery(driverQueryOptions(keycloakUserId));
  if (existing) return existing;

  const created = await createDriverForAccount();
  queryClient.setQueryData(driverKeys.detail(keycloakUserId), created);
  return created;
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
