import { apiClient } from './client';
import type {
  Driver,
  DriverInput,
  PasswordResetResult,
  PasswordResetTicket,
  VerificationChallenge,
  VerificationResult,
} from './types';

// There is no self-registration call any more: a deliverer applies through
// `driver-request-service.ts`, and the account only comes into existence when
// staff approve the application. The identification lookup moved there too.

/**
 * Asks the backend to mail a one-time code to a registered address — the first
 * step of the verification gate that sits between sign-up and the app itself.
 * Also the "Resend" action.
 *
 * Runs unauthenticated: it happens before the deliverer's first login, so
 * there is no token to send. Rejected with 429 inside the resend cool-down,
 * whose remaining seconds come back in the ProblemDetail.
 *
 * Deliverer-scoped: the backend resolves the address against Driver records
 * only, so a customer's address answers 404 here.
 */
export async function sendVerificationCode(email: string): Promise<VerificationChallenge> {
  const { data } = await apiClient.post<VerificationChallenge>('/drivers/verification/send', {
    email,
  });
  return data;
}

/**
 * Redeems the code. On success the backend flips the Keycloak account's
 * `emailVerified` flag, which is what every later token reports in its
 * `email_verified` claim.
 *
 * Throws ApiError(400) for a wrong code, 410 for an expired one and 429 once
 * the attempts are used up — the screen tells those apart to decide whether to
 * push the deliverer towards "Resend".
 */
export async function confirmVerificationCode(
  email: string,
  code: string
): Promise<VerificationResult> {
  const { data } = await apiClient.post<VerificationResult>('/drivers/verification/confirm', {
    email,
    code,
  });
  return data;
}

/**
 * Step one of a forgotten-password reset: mails a one-time code to a
 * registered address. Also the "Resend" action.
 *
 * Answers the same `VerificationChallenge` as the sign-up code — same boxes,
 * same cool-down — but it is a different code entirely: the backend keeps the
 * two flows in separate rows, so one can never be spent on the other. Throws
 * ApiError(404) when no deliverer is registered under the address, and 429
 * inside the resend cool-down.
 */
export async function sendPasswordResetCode(email: string): Promise<VerificationChallenge> {
  const { data } = await apiClient.post<VerificationChallenge>('/drivers/password-reset/send', {
    email,
  });
  return data;
}

/**
 * Step two: spends the mailed code and returns the ticket that authorizes the
 * password change. The code dies here, whether or not the reset is finished.
 *
 * Throws ApiError(400) for a wrong code, 410 for an expired one and 429 once
 * the attempts are used up — the same statuses as the sign-up code, so the
 * screen can branch on them identically.
 */
export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<PasswordResetTicket> {
  const { data } = await apiClient.post<PasswordResetTicket>('/drivers/password-reset/verify', {
    email,
    code,
  });
  return data;
}

/**
 * Step three: spends the ticket and writes the new password. Throws
 * ApiError(400) for a spent or unknown ticket (and for a password the realm
 * refuses) and 410 once the ticket has expired — both mean the reset has to be
 * started again.
 */
export async function confirmPasswordReset(
  email: string,
  ticket: string,
  newPassword: string
): Promise<PasswordResetResult> {
  const { data } = await apiClient.post<PasswordResetResult>('/drivers/password-reset/confirm', {
    email,
    ticket,
    newPassword,
  });
  return data;
}

/**
 * Resolves the driver record linked to a Keycloak account (the access
 * token's `sub` claim). Throws ApiError(404) when no record exists — e.g. an
 * account created through Google sign-in rather than in-app registration.
 */
export async function getDriverByAccount(keycloakUserId: string): Promise<Driver> {
  const { data } = await apiClient.get<Driver>(
    `/drivers/by-account/${encodeURIComponent(keycloakUserId)}`
  );
  return data;
}

/**
 * Partial update: the backend resolves the driver by `code` (= the Keycloak
 * user id for app-registered deliverers) and applies only the fields present.
 * Sending a different `vehicle.type` also swaps the vehicle-class realm role.
 */
export async function updateDriver(input: DriverInput): Promise<Driver> {
  const { data } = await apiClient.put<Driver>('/drivers', input);
  return data;
}
