import { useCallback, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { buildProfileUpdate, type ProfileChanges } from '@/features/profile/profile-input';
import { isApiError } from '@/services/api/client';
import type { Driver } from '@/services/api/types';
import { useUpdateDriver } from '@/hooks/use-driver';

/**
 * Applies a profile edit end to end: `PUT /drivers`, then a refresh of the
 * Keycloak userinfo.
 *
 * The second half is what keeps the app honest. The backend mirrors name,
 * e-mail and phone onto the linked Keycloak user in the same transaction, so
 * after a successful update the `user` in the auth context — read by the
 * drawer, and the fallback Settings shows while the driver record loads — is
 * stale until it is re-fetched. Refreshing it here means every screen agrees
 * the moment the editor closes.
 */
export function useUpdateProfile() {
  const { user, reloadUser } = useAuth();
  const updateDriver = useUpdateDriver();
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (driver: Driver, changes: ProfileChanges): Promise<boolean> => {
      setError(null);
      const input = buildProfileUpdate(driver, user?.sub, changes);
      // Nothing actually changed — treat it as a success so the editor closes
      // the way it would have anyway.
      if (!input) return true;

      try {
        await updateDriver.mutateAsync(input);
        // A failure here is not a failure of the save: the record is already
        // written. The claims simply catch up on the next natural refresh.
        await reloadUser().catch(() => {});
        return true;
      } catch (cause) {
        setError(messageFor(cause));
        return false;
      }
    },
    [user?.sub, updateDriver, reloadUser]
  );

  return { save, isSaving: updateDriver.isPending, error, clearError: () => setError(null) };
}

/**
 * The statuses `DriverControllerAdvice` maps, turned into something worth
 * reading. 409 is the one that matters most: it means the address is already
 * some other account's login, which the deliverer can act on.
 */
function messageFor(cause: unknown): string {
  if (isApiError(cause, 409)) {
    return 'That email address is already used by another account.';
  }
  if (isApiError(cause, 400)) {
    return cause instanceof Error && cause.message
      ? cause.message
      : 'Those details were refused. Please check them and try again.';
  }
  if (isApiError(cause, 404)) {
    return 'We could not find your deliverer record. Please sign in again.';
  }
  if (isApiError(cause, 503)) {
    return 'The account service is unavailable right now. Please try again shortly.';
  }
  return cause instanceof Error && cause.message
    ? cause.message
    : 'We could not save your changes. Please try again.';
}
