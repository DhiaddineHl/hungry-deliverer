import { z } from 'zod';

import { VEHICLE_TYPES } from '@/services/api/types';

/**
 * Validation schemas for the auth forms. They gate the form locally; the
 * backend re-validates everything and owns the Keycloak account.
 */

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginValues = z.infer<typeof loginSchema>;

/** Vehicle classes that need a plate to be dispatchable. */
export const MOTORIZED_VEHICLES: readonly string[] = [
  'MOTORCYCLE',
  'SCOOTER',
  'CAR',
  'VAN',
  'TRUCK',
];

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^[0-9\s]{6,}$/, 'Enter a valid phone number'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    verifyPassword: z.string().min(1, 'Please confirm your password'),
    // The class the deliverer signs up with. The backend turns it into the
    // Vehicle assigned to the new driver AND into the VEHICLE_<CLASS> realm
    // role on the Keycloak account, so it is required at registration.
    vehicleType: z.enum(VEHICLE_TYPES, {
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
