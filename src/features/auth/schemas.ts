import { z } from 'zod';

/**
 * Validation schemas for the auth forms. The authentication itself is still a
 * stub — these only gate the form locally until the real API is wired in.
 */

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginValues = z.infer<typeof loginSchema>;

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
  })
  .refine((values) => values.password === values.verifyPassword, {
    message: 'Passwords do not match',
    path: ['verifyPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
