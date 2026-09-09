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

export type DemandLevel = 'busy' | 'moderate' | 'quiet';

export type Hotspot = {
  id: string;
  coordinate: LatLng;
  level: DemandLevel;
};

export type BusyPlace = {
  id: string;
  name: string;
  distanceKm: number;
  description: string;
  coordinate: LatLng;
};

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
   * The backend `Delivery.id` and `Order.id` this offer/session addresses —
   * required by `respondToDelivery`/`updateDeliveryStatus`. Not shown
   * anywhere; `reference` is what the UI displays.
   */
  deliveryId: string;
  orderId: string;
  payoutTnd: number;
  totalTnd: number;
  durationMinutes: number;
  distanceKm: number;
  minutesToPickup: number;
  expectedArrival: string;
  arrivedAt: string;
  store: Store;
  customer: Customer;
  items: OrderItem[];
  /** Precomputed polylines (a real app would call a Directions API). */
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
};
