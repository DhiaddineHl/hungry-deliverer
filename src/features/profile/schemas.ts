import { z } from 'zod';

/**
 * Validation for the Settings editors. One schema per editable field, because
 * the screen edits exactly one at a time and a partial update must never carry
 * a field the deliverer did not touch.
 *
 * Messages are catalogue keys, translated at render — see the note in
 * `features/auth/schemas.ts`.
 *
 * The rules deliberately match `features/auth/schemas.ts` — a name or a phone
 * number that sign-up would have refused must not become reachable by editing
 * the profile afterwards.
 */

export const profileNameSchema = z.object({
  firstName: z.string().min(1, 'validation.firstNameRequired'),
  lastName: z.string().min(1, 'validation.lastNameRequired'),
});

export type ProfileNameValues = z.infer<typeof profileNameSchema>;

/**
 * The address is the Keycloak username as well as the contact e-mail — the
 * backend sets both from this one field — so changing it changes how the
 * deliverer signs in.
 */
export const profileEmailSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
});

export type ProfileEmailValues = z.infer<typeof profileEmailSchema>;

export const profilePhoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'validation.phoneRequired')
    .regex(/^[0-9+\s]{6,}$/, 'validation.phoneInvalid'),
});

export type ProfilePhoneValues = z.infer<typeof profilePhoneSchema>;

/** Which field an `/edit-profile` visit is editing. */
export const PROFILE_FIELDS = ['name', 'email', 'phone'] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export function isProfileField(value: unknown): value is ProfileField {
  return typeof value === 'string' && (PROFILE_FIELDS as readonly string[]).includes(value);
}
