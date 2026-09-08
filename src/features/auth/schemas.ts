import { z } from 'zod';

import type { VehicleType } from '@/services/api/types';

/**
 * Validation schemas for the auth forms. They gate the form locally; the
 * backend re-validates everything and owns the Keycloak account.
 */

/**
 * Step one of signing in: the address alone. What the backend answers for it
 * decides whether step two is the password field or the sign-up form, so
 * nothing else is asked here.
 */
export const identificationSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

export type IdentificationValues = z.infer<typeof identificationSchema>;

/** Step two for an address that already has an account. */
export const passwordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type PasswordValues = z.infer<typeof passwordSchema>;

/**
 * The forgotten-password entry form. Same rule as identification — an address
 * is an address — but a schema of its own, because the two screens ask for it
 * for different reasons and their copy differs.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * The last step of a reset: the new password, typed twice. The eight-character
 * floor is `registerSchema`'s, and the backend's `DriverPasswordResetService`
 * holds the same line — a reset must not be a way to end up with a weaker
 * password than sign-up would have allowed.
 */
export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
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
 * The rest of the sign-up form. No `email`: identification already settled the
 * address and hands it over as a route param, so the screen shows it back
 * rather than asking for it again.
 */
export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^[0-9\s]{6,}$/, 'Enter a valid phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    verifyPassword: z.string().min(1, 'Please confirm your password'),
    // The class the deliverer signs up with. The backend turns it into the
    // Vehicle assigned to the new driver AND into the VEHICLE_<CLASS> realm
    // role on the Keycloak account, so it is required at registration.
    vehicleType: z.enum(REGISTRABLE_VEHICLE_TYPES, {
      errorMap: () => ({ message: 'Choose how you deliver' }),
    }),
    licensePlate: z.string().optional(),
    licenseNumber: z.string().optional(),
  })
  .refine((values) => values.password === values.verifyPassword, {
    message: 'Passwords do not match',
    path: ['verifyPassword'],
  })
  .refine(
    (values) => !MOTORIZED_VEHICLES.includes(values.vehicleType) || !!values.licensePlate?.trim(),
    { message: 'License plate is required for a motorized vehicle', path: ['licensePlate'] }
  );

export type RegisterValues = z.infer<typeof registerSchema>;
