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

/**
 * One assignment offer, as carried on hungry-notification's
 * `/topic/drivers/{driverId}/notifications` STOMP topic (`type: 'ORDER_ASSIGNED'`).
 *
 * This is genuinely everything the wire message carries — the assignment
 * engine's `OrderInfo`/`Assignment` records hold pickup/dropoff coordinates
 * only, no restaurant/customer name, phone, address or item list, and no
 * payout (`Order`/`OrderItem` hold no money anywhere in this backend). See
 * `features/session/order-mapper.ts` for how this maps onto the richer
 * `Order` shape the existing offer/delivery screens expect.
 */
export interface AssignmentOffer {
  deliveryId: string;
  orderId: string;
  pickup: { latitude: number; longitude: number };
  dropoff: { latitude: number; longitude: number };
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

// ---------------------------------------------------------------------------
// E-mail verification (DriverVerificationService)
// ---------------------------------------------------------------------------

/**
 * Answer to `POST /drivers/verification/send`: everything the code screen
 * needs to draw itself. `codeLength` is authoritative — the backend decides how
 * many digits it generates, so the screen renders that many boxes rather than
 * assuming a number.
 */
export interface VerificationChallenge {
  email: string;
  codeLength: number;
  expiresInSeconds: number;
  /** Seconds the Resend button stays disabled after this send. */
  resendAvailableInSeconds: number;
  /** The address was already confirmed; nothing was sent and the app may move on. */
  alreadyVerified: boolean;
  /** False when the backend has no mail transport (dev) and only logged the code. */
  delivered: boolean;
}

/** Answer to `POST /drivers/verification/confirm`. */
export interface VerificationResult {
  email: string;
  keycloakUserId: string;
  verified: boolean;
}

/**
 * Answer to `POST /drivers/password-reset/verify` — the middle step of a
 * forgotten-password reset.
 */
export interface PasswordResetTicket {
  email: string;
  /**
   * The single-use secret that authorizes the password change. Held in memory
   * for one screen and never persisted — see `store/password-reset-store.ts`.
   */
  ticket: string;
  expiresInSeconds: number;
}

/** Answer to `POST /drivers/password-reset/confirm`. */
export interface PasswordResetResult {
  email: string;
  updated: boolean;
}

/**
 * Answer to `POST /drivers/verification/lookup` — the identification step.
 * One address in, and `registered` decides which screen comes next: the
 * password field for an address that already has a deliverer account, the
 * sign-up form for one that does not.
 *
 * Deliverer-scoped like the two calls above: the backend resolves the address
 * against Driver records only, so a customer's address answers
 * `registered: false` here.
 */
export interface AccountLookup {
  email: string;
  /** A deliverer is registered under this address — ask for a password. */
  registered: boolean;
  /** That account has already confirmed the address. */
  emailVerified: boolean;
}
