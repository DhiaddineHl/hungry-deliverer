/**
 * Central query-key factory. All driver cache entries live under the
 * 'drivers' root, so one `invalidateQueries({ queryKey: driverKeys.all })`
 * reaches every derived key.
 */
export const driverKeys = {
  all: ['drivers'] as const,
  details: () => [...driverKeys.all, 'detail'] as const,
  /** Keyed by the Keycloak account id (the token's `sub`). */
  detail: (keycloakUserId: string) => [...driverKeys.details(), keycloakUserId] as const,
};
