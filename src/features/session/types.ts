export type LatLng = {
  latitude: number;
  longitude: number;
};

/**
 * The courier session state machine. Each phase maps to a frame in /design.
 *
 * offline → finding → offer → toStore → orderReady → toCustomer → completed → offline
 */
export type SessionPhase =
  | 'offline'
  | 'finding'
  | 'offer'
  | 'toStore'
  | 'orderReady'
  | 'toCustomer'
  | 'completed';

/** Which half of the trip is drawn on the map / highlighted in the offer card. */
export type RouteLeg = 'store' | 'customer';

export type OrderItem = {
  id: string;
  quantity: number;
  name: string;
};

export type Store = {
  name: string;
  address: string;
  phone: string;
  coordinate: LatLng;
};

export type Customer = {
  name: string;
  address: string;
  phone: string;
  /** Neighbourhood shown in the offer card — the courier only sees the area before accepting. */
  areaLabel: string;
  coordinate: LatLng;
};

export type Order = {
  /** Displayed as "#2043" and on the full-screen pickup code. */
  reference: string;
  /**
   * The backend `Order.id` this offer/session addresses, and the `Delivery.id`
   * accepting it created — `null` while the offer is still pending, since the
   * backend only creates the row on acceptance. `updateDeliveryStatus` needs
   * the latter. Neither is shown anywhere; `reference` is what the UI displays.
   */
  orderId: string;
  deliveryId: string | null;
  totalTnd: number;
  /** The rider's earnings for the trip, when the backend provides them. */
  riderEarningsTnd: number | null;
  /** How the customer pays; `null` while the backend does not say. */
  paymentMethod: 'cash' | 'online' | null;
  durationMinutes: number;
  distanceKm: number;
  minutesToPickup: number;
  expectedArrival: string;
  arrivedAt: string;
  /** When the offer auto-declines, epoch ms — drives the countdown on the card. */
  expiresAt: number;
  /** `expiresAt` minus the moment the offer was mapped — the countdown the card animates, fixed once. */
  countdownMs: number;
  store: Store;
  customer: Customer;
  items: OrderItem[];
  /** Straight lines for the pre-navigation preview; real guidance comes from the Directions API. */
  routeToStore: LatLng[];
  routeToCustomer: LatLng[];
  etaToStoreMinutes: number;
  etaToCustomerMinutes: number;
};

export type SessionState = {
  phase: SessionPhase;
  /** The offer on the table, or the order being delivered. Null when idle. */
  order: Order | null;
  /** Leg previewed on the map — driven by the bullets in the offer card. */
  previewedLeg: RouteLeg;
  /** Whether the active-order sheet is expanded. */
  sheetExpanded: boolean;
  /** An accept is in flight — the card disables its button until the backend answers. */
  accepting: boolean;
};
