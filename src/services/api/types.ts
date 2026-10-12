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
 * One assignment offer — `delivery.hungry.delivery.application.model.DeliveryOfferOutputData`.
 *
 * The same shape everywhere the app meets an offer: inside the `ORDER_OFFERED`
 * frame on `/topic/drivers/{driverId}/notifications` (as `offer`), the answer
 * to `GET /api/offers/current`, and the answer to `POST /api/offers/{orderId}/accept`.
 * `deliveryId` is `null` while the offer is pending and set on the accept
 * response — the backend only creates the `Delivery` row when the driver
 * says yes.
 *
 * ETAs come from the backend's routing engine (OSRM when configured), from
 * where the driver was when matched; `distanceKm` is the straight-line total
 * of both legs, an indication rather than a route length. There is no driver
 * payout: nothing on the platform models one yet, so the offer card shows the
 * order total instead.
 */
export interface DeliveryOffer {
  orderId: string;
  deliveryId: string | null;
  restaurantName: string | null;
  pickupAddress: string | null;
  pickupLatitude: number;
  pickupLongitude: number;
  customerName: string | null;
  dropoffAddress: string | null;
  dropoffLatitude: number;
  dropoffLongitude: number;
  items: { quantity: number; name: string | null }[];
  total: number | null;
  currency: string | null;
  comment: string | null;
  /**
   * What the rider earns for this trip. Not sent by the backend yet — the
   * offer card shows the order total, labelled as such, until it is.
   */
  driverEarnings?: number | null;
  /** `CASH` / `ONLINE`. Not sent yet; "Collect in cash" only shows once it is. */
  paymentMethod?: string | null;
  etaToPickupMinutes: number;
  etaToDropoffMinutes: number;
  distanceKm: number;
  /** ISO-8601 instants, informational — the countdown is driven by `expiresInMs`. */
  offeredAt: string;
  expiresAt: string;
  /** Time left to answer, measured on the server when this was built — immune to clock skew. */
  expiresInMs: number;
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

// ---------------------------------------------------------------------------
// Deliverer applications (delivery.hungry.driverrequest)
// ---------------------------------------------------------------------------

/**
 * `DriverRequestLookup.Outcome` — which screen the identification step leads to.
 *
 *   - `NOT_FOUND`: no account and no application — the application form.
 *   - `PENDING`: an application is under review — the "under review" screen,
 *     no resubmission.
 *   - `REJECTED`: the latest application was declined — the form again, with
 *     the staff-supplied reason if there is one.
 *   - `ACCOUNT_EXISTS`: the application was approved (or the account predates
 *     applications) — the password screen.
 */
export type ApplicantOutcome = 'NOT_FOUND' | 'PENDING' | 'REJECTED' | 'ACCOUNT_EXISTS';

/** Answer to `POST /driver-requests/verification/lookup`. */
export interface ApplicantLookup {
  email: string;
  outcome: ApplicantOutcome;
  /**
   * Only meaningful for `ACCOUNT_EXISTS`. An approved applicant's account is
   * created unverified with a password nobody knows, so `false` here is what
   * tells the password screen to offer "set your password" first.
   */
  emailVerified: boolean;
  /** Only for `REJECTED`, and only when staff gave one. */
  rejectionReason: string | null;
}

/** `DriverRequestStatus`. */
export type DriverRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * `DriverRequestInputData`. No status and no document URLs: the status is
 * engine-driven, and each document is attached after creation through its own
 * upload endpoint.
 */
export interface DriverRequestInput {
  name?: string;
  fullname: Fullname;
  contact: PersonalContact;
  vehicleType: VehicleType;
  /** Required server-side (`@NotBlank`). */
  licensePlate: string;
  licenseNumber?: string;
}

/** `DriverRequestOutputData`. */
export interface DriverRequest {
  id: string;
  code?: string | null;
  name?: string | null;
  fullname?: Fullname | null;
  contact?: PersonalContact | null;
  vehicleType?: VehicleType | null;
  licensePlate?: string | null;
  licenseNumber?: string | null;
  status?: DriverRequestStatus | null;
  rejectionReason?: string | null;
  livePhotoUrl?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  vehicleRegistrationCardUrl?: string | null;
  createdAt?: string | null;
}

/**
 * The four upload endpoints under `/driver-requests/{id}/…`. The live photo
 * and both sides of the ID card are required before staff can approve; the
 * vehicle registration card is optional.
 */
export const APPLICATION_DOCUMENTS = [
  'live-photo',
  'id-card-front',
  'id-card-back',
  'vehicle-registration-card',
] as const;

export type ApplicationDocument = (typeof APPLICATION_DOCUMENTS)[number];

export const REQUIRED_APPLICATION_DOCUMENTS: readonly ApplicationDocument[] = [
  'live-photo',
  'id-card-front',
  'id-card-back',
];
