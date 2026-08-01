import { apiClient } from './client';
import type { Driver, DriverInput, VehicleType } from './types';

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
