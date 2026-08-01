/**
 * DTO shapes of the Hungry backend (hungry-backend, Spring Boot).
 * Mirrors delivery.hungry.driver.application.model.* and the shared
 * delivery.hungry.core value objects — keep in sync with the Java side.
 */

export interface Fullname {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
}

export interface PersonalContact {
  phones?: string[] | null;
  email?: string | null;
}

export interface GeoCoordinates {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
}

/** delivery.hungry.core.application.model.localization.Address */
export interface BackendAddress {
  streetNumber?: string | null;
  streetName?: string | null;
  streetType?: string | null;
  streetDirection?: string | null;
  buildingName?: string | null;
  floor?: number | null;
  state?: string | null;
  municipality?: string | null;
  postalCode?: string | null;
  country?: string | null;
  coordinates?: GeoCoordinates | null;
  plusCode?: string | null;
  geohash?: string | null;
  formattedAddress?: string | null;
}

/**
 * The vehicle class a deliverer signs up with. It decides both the Vehicle
 * row the backend creates and the `VEHICLE_<CLASS>` realm role on the
 * Keycloak account, so these names must match the Java `VehicleType` enum.
 */
export const VEHICLE_TYPES = [
  'BICYCLE',
  'MOTORCYCLE',
  'SCOOTER',
  'CAR',
  'VAN',
  'TRUCK',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** delivery.hungry.driver.application.model.DriverStatus */
export type DriverStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'ON_BREAK'
  | 'AVAILABLE'
  | 'ON_DELIVERY'
  | 'OFFLINE';

/** VehicleInputData. */
export interface VehicleInput {
  id?: string;
  code?: string;
  name?: string;
  type: VehicleType;
  licensePlate?: string;
  model?: string;
  color?: string;
  make?: string;
  year?: number;
  vinNumber?: string;
  isActive?: boolean;
  capacityLitres?: number;
}

/** VehicleOutputData. */
export interface Vehicle {
  id: string;
  code?: string | null;
  name?: string | null;
  type?: VehicleType | null;
  licensePlate?: string | null;
  model?: string | null;
  color?: string | null;
  make?: string | null;
  year?: number | null;
  vinNumber?: string | null;
  isActive?: boolean | null;
  capacityLitres?: number | null;
}

/**
 * DriverInputData. `code` identifies the driver on updates; it defaults to
 * the Keycloak user id (the token's `sub`) at registration. `password` is
 * only sent at registration — the backend provisions the Keycloak login with
 * it. On update, fields left undefined are kept as-is server-side, and
 * `status` is ignored (approval is a back-office decision).
 */
export interface DriverInput {
  code?: string;
  name?: string;
  fullname?: Fullname;
  contact?: PersonalContact;
  address?: BackendAddress;
  licenseNumber?: string;
  /** ISO date (yyyy-MM-dd); the backend requires it to be in the future. */
  licenseExpiryDate?: string;
  experienceYears?: number;
  vehicle?: VehicleInput;
  password?: string;
}

/** DriverOutputData. */
export interface Driver {
  id: string;
  code?: string | null;
  name?: string | null;
  fullname?: Fullname | null;
  contact?: PersonalContact | null;
  address?: BackendAddress | null;
  licenseNumber?: string | null;
  licenseExpiryDate?: string | null;
  status?: DriverStatus | null;
  vehicle?: Vehicle | null;
  experienceYears?: number | null;
  rating?: number | null;
  enabled?: boolean;
  keycloakUserId?: string | null;
}
