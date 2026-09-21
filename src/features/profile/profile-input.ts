import type { Driver, DriverInput } from '@/services/api/types';

/**
 * Turns "the deliverer changed one field" into the body `PUT /drivers` expects.
 *
 * Two things about the backend shape this module exists to encode, because
 * getting either wrong silently destroys data:
 *
 * 1. `code` identifies the record. It defaults to the Keycloak user id at
 *    registration, so the token's `sub` addresses it — but a record whose code
 *    was set to something else server-side must still be addressed by its own
 *    code, which is why `driver.code` is preferred over the account id.
 *
 * 2. `contact` and `fullname` are REPLACED wholesale, not merged
 *    (`DriverCrudService.update` does `existing.setContact(incoming)`). Sending
 *    a contact with only a phone therefore erases the e-mail — and with it the
 *    Keycloak username. So both objects are always rebuilt in full from the
 *    current record, with only the edited part swapped.
 */

export type ProfileChanges = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

/**
 * The display name the backend stores alongside `fullname`. Kept in step with
 * the two parts, so the drawer and the Keycloak profile never disagree.
 */
function displayName(firstName: string, lastName: string, fallback: string): string {
  const joined = `${firstName} ${lastName}`.trim();
  return joined || fallback;
}

/**
 * Builds the partial update. `accountId` is the token's `sub`, used as the
 * record's address only when it carries no code of its own.
 *
 * Returns null when the change is a no-op — nothing actually differs from the
 * record — so the caller can skip a pointless round-trip that would still
 * rewrite the Keycloak user.
 */
export function buildProfileUpdate(
  driver: Driver,
  accountId: string | null | undefined,
  changes: ProfileChanges
): DriverInput | null {
  const code = driver.code ?? driver.keycloakUserId ?? accountId;
  if (!code) return null;

  const currentFirst = driver.fullname?.firstName ?? '';
  const currentLast = driver.fullname?.lastName ?? '';
  const currentEmail = driver.contact?.email ?? '';
  const currentPhones = driver.contact?.phones ?? [];

  const firstName = changes.firstName?.trim() ?? currentFirst;
  const lastName = changes.lastName?.trim() ?? currentLast;
  const email = (changes.email?.trim().toLowerCase() ?? currentEmail) || currentEmail;
  const phone = changes.phone?.trim();

  // Only the first phone is the deliverer's own number — the one mirrored to
  // Keycloak as the `phoneNumber` claim. Any others the record holds are left
  // where they are rather than dropped.
  const phones = phone !== undefined ? [phone, ...currentPhones.slice(1)] : currentPhones;

  const nameChanged = firstName !== currentFirst || lastName !== currentLast;
  const emailChanged = email !== currentEmail;
  const phoneChanged = phone !== undefined && phone !== (currentPhones[0] ?? '');
  if (!nameChanged && !emailChanged && !phoneChanged) return null;

  return {
    code,
    // Sent in full on every edit: see the wholesale-replace note above.
    fullname: {
      firstName,
      middleName: driver.fullname?.middleName ?? null,
      lastName,
    },
    contact: {
      email,
      phones,
    },
    ...(nameChanged
      ? { name: displayName(firstName, lastName, driver.name ?? email) }
      : {}),
  };
}
