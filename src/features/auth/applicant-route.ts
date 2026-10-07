import type { Href } from 'expo-router';

import { sendPasswordResetCode } from '@/services/api/driver-service';
import type { ApplicantLookup } from '@/services/api/types';
import { usePasswordResetStore } from '@/store/password-reset-store';

/**
 * An approved applicant who has never signed in: the account exists, but it
 * was created unverified with a generated password nobody was told. They go
 * straight to choosing a password instead of the password screen.
 */
export function needsActivation(lookup: ApplicantLookup): boolean {
  return lookup.outcome === 'ACCOUNT_EXISTS' && !lookup.emailVerified;
}

/**
 * Mails the one code an approved applicant needs and opens the reset flow in
 * its 'activation' mode: code screen → set password → signed in. That code is
 * also what verifies the address (the backend marks it verified when the
 * password is set), so no second code is asked for after the sign-in.
 *
 * Resolves with the route to push: the code screen.
 */
export async function startActivation(email: string): Promise<Href> {
  await sendPasswordResetCode(email);
  usePasswordResetStore.getState().start(email, 'activation');
  return '/reset-code';
}

/**
 * Where an identified address goes next. Shared by the identification screen
 * and the "under review" screen's status check, so both always agree.
 *
 * The address travels as a route param rather than in a store: it is not a
 * secret, and a param survives the screen being remounted by a reload.
 */
export function routeForApplicant(lookup: ApplicantLookup): Href {
  const { email } = lookup;
  switch (lookup.outcome) {
    case 'ACCOUNT_EXISTS':
      // Callers check `needsActivation` first; what reaches here is an
      // ordinary sign-in.
      return { pathname: '/password', params: { email } };
    case 'PENDING':
      return { pathname: '/application-status', params: { email } };
    case 'REJECTED':
      return {
        pathname: '/register',
        params: { email, reapply: '1', rejectionReason: lookup.rejectionReason ?? '' },
      };
    case 'NOT_FOUND':
    default:
      return { pathname: '/register', params: { email } };
  }
}
