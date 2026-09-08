import { apiClient } from './client';
import type {
  AccountLookup,
  Driver,
  DriverInput,
  PasswordResetResult,
  PasswordResetTicket,
  VehicleType,
  VerificationChallenge,
  VerificationResult,
} from './types';

export interface DriverRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  /** Vehicle class the deliverer signs up with — see below. */
  vehicleType: VehicleType;
  licensePlate?: string;
  licenseNumber?: string;
  /** ISO date (yyyy-MM-dd), must be in the future. */
  licenseExpiryDate?: string;
}

/**
 * Registers a deliverer: one call, and the backend provisions the Keycloak
 * login account and the Driver entity atomically.
 *
 * The vehicle class travels with it and does double duty server-side: it
 * creates the Vehicle assigned to the new driver, and it adds the
 * `VEHICLE_<CLASS>` realm role next to `DRIVER` on the Keycloak user, so the
 * access token says what the deliverer drives. Runs unauthenticated — there
 * is no session yet, which is why `POST /drivers` is the one open driver
 * endpoint.
 */
export async function registerDriver(registration: DriverRegistration): Promise<Driver> {
  const input: DriverInput = {
    name: `${registration.firstName} ${registration.lastName}`.trim(),
    fullname: { firstName: registration.firstName, lastName: registration.lastName },
    contact: {
      email: registration.email,
      phones: registration.phoneNumber ? [registration.phoneNumber] : [],
    },
    licenseNumber: registration.licenseNumber,
    licenseExpiryDate: registration.licenseExpiryDate,
    vehicle: {
      type: registration.vehicleType,
      licensePlate: registration.licensePlate,
      isActive: true,
    },
    password: registration.password,
  };
  const { data } = await apiClient.post<Driver>('/drivers', input);
  return data;
}

/**
 * The identification step: one address in, and the answer decides which screen
 * comes next — the password field for an address that already has a deliverer
 * account, the sign-up form for one that does not.
 *
 * Runs unauthenticated, like the two calls below: it is the very first thing
 * the app asks, before any session exists.
 */
export async function lookupAccount(email: string): Promise<AccountLookup> {
  const { data } = await apiClient.post<AccountLookup>('/drivers/verification/lookup', {
    email,
  });
  return data;
}

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
 * Creates the driver record for the account the current access token belongs
 * to, and returns the existing one if there already is one (the endpoint is
 * idempotent).
 *
 * Social logins never pass through `registerDriver`: Keycloak provisions the
 * account itself when brokering to Google, so `POST /drivers` — which always
 * creates a NEW Keycloak user — answers 409 for them. `POST /drivers/me` is
 * the authenticated counterpart: it attaches a record to the identity the
 * token already proves, so no password is sent and the `sub` is never taken
 * from this body. Email and name are read from Keycloak server-side; only the
 * optional extras below are ours to send.
 *
 * The vehicle class is optional here — a "Continue with Google" sign-in has no
 * sign-up form to carry one. The deliverer is created PENDING_APPROVAL either
 * way, and the class can be filled in later through `updateDriver`, which is
 * what grants the `VEHICLE_<CLASS>` realm role.
 */
export async function createDriverForAccount(
  extras: Pick<DriverInput, 'name' | 'contact' | 'vehicle' | 'licenseNumber' | 'licenseExpiryDate'> = {}
): Promise<Driver> {
  const { data } = await apiClient.post<Driver>('/drivers/me', extras);
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
