import type { Href } from 'expo-router';

import { sendPasswordResetCode } from '@/services/api/driver-service';
import type { ApplicantLookup } from '@/services/api/types';
import { useApplicantStore } from '@/store/applicant-store';
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
 * The address travels as a route param: it is not a secret, and a param
 * survives the screen being remounted by a reload. The rejection verdict does
 * not — any route can be opened by a link, so it goes to an in-memory store.
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
      // The verdict stays in memory — see store/applicant-store.ts.
      useApplicantStore.getState().setOutcome({
        email,
        rejected: true,
        rejectionReason: lookup.rejectionReason,
      });
      return { pathname: '/register', params: { email } };
    case 'NOT_FOUND':
    default:
      useApplicantStore.getState().setOutcome({ email, rejected: false });
      return { pathname: '/register', params: { email } };
  }
}
