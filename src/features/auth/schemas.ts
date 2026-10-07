import { z } from 'zod';

import type { VehicleType } from '@/services/api/types';

/**
 * Validation schemas for the auth forms. They gate the form locally; the
 * backend re-validates everything and owns the Keycloak account.
 *
 * Messages are catalogue KEYS rather than sentences. These schemas are built
 * once at module load, before any language is known and long before a language
 * change could re-run them, so a translated string baked in here would be stuck
 * in whatever language the app started in. The field components translate the
 * key at render instead, which is the moment the language is actually known.
 */

/**
 * Step one of signing in: the address alone. What the backend answers for it
 * decides whether step two is the password field or the sign-up form, so
 * nothing else is asked here.
 */
export const identificationSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
});

export type IdentificationValues = z.infer<typeof identificationSchema>;

/** Step two for an address that already has an account. */
export const passwordSchema = z.object({
  password: z.string().min(1, 'validation.passwordRequired'),
});

export type PasswordValues = z.infer<typeof passwordSchema>;

/**
 * The forgotten-password entry form. Same rule as identification — an address
 * is an address — but a schema of its own, because the two screens ask for it
 * for different reasons and their copy differs.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * The last step of a reset: the new password, typed twice. The eight-character
 * floor is the one sign-up used to enforce, and the backend's `DriverPasswordResetService`
 * holds the same line — a reset must not be a way to end up with a weaker
 * password than sign-up would have allowed.
 */
export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'validation.passwordTooShort'),
    confirmPassword: z.string().min(1, 'validation.passwordConfirm'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

/**
 * The vehicle classes a deliverer may sign up with — a deliberate subset of the
 * backend's `VehicleType` enum, which also covers BICYCLE, VAN and TRUCK. Those
 * remain valid server-side (the back-office can assign them); they are just not
 * offered at self-registration. This is the single source of truth for the
 * sign-up form: `VehicleClassField` renders exactly these, and the schema below
 * rejects anything else, so the picker and the validation can never drift.
 */
export const REGISTRABLE_VEHICLE_TYPES = ['MOTORCYCLE', 'SCOOTER', 'CAR'] as const satisfies
  readonly VehicleType[];

/** Vehicle classes that need a plate to be dispatchable. */
export const MOTORIZED_VEHICLES: readonly string[] = [
  'MOTORCYCLE',
  'SCOOTER',
  'CAR',
  'VAN',
  'TRUCK',
];

/**
 * The deliverer application form. No `email`: identification already settled
 * the address and hands it over as a route param. No password either — the
 * account is only created when staff approve the application, and the
 * deliverer chooses a password then (the "set my password" flow).
 *
 * The documents are not part of this schema: they are local files held by the
 * screen and uploaded after the application is created, one call each.
 */
export const applicationSchema = z
  .object({
    firstName: z.string().min(1, 'validation.firstNameRequired'),
    lastName: z.string().min(1, 'validation.lastNameRequired'),
    phone: z
      .string()
      .min(1, 'validation.phoneRequired')
      .regex(/^[0-9\s]{6,}$/, 'validation.phoneInvalid'),
    // Becomes the Vehicle of the approved driver AND the VEHICLE_<CLASS> realm
    // role on their Keycloak account.
    vehicleType: z.enum(REGISTRABLE_VEHICLE_TYPES, {
      errorMap: () => ({ message: 'validation.vehicleRequired' }),
    }),
    licensePlate: z.string().optional(),
    licenseNumber: z.string().optional(),
  })
  .refine(
    (values) => !MOTORIZED_VEHICLES.includes(values.vehicleType) || !!values.licensePlate?.trim(),
    { message: 'validation.licensePlateRequired', path: ['licensePlate'] }
  );

export type ApplicationValues = z.infer<typeof applicationSchema>;
