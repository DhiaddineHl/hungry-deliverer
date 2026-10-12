import type { DeliveryOffer } from '@/services/api/types';
import type { LatLng, Order } from './types';

/**
 * What arrives on `/topic/drivers/{driverId}/notifications` — the exact
 * `type` values `AssignmentNotificationDispatcher` writes. Anything else on
 * the topic parses to `null` (a wire message is never trusted blindly).
 */
export type DriverNotification =
  | { type: 'ORDER_OFFERED'; offer: DeliveryOffer }
  | { type: 'OFFER_EXPIRED'; orderId: string };

export function parseDriverNotification(payload: unknown): DriverNotification | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const data = payload as Record<string, unknown>;

  if (data.type === 'ORDER_OFFERED') {
    const offer = parseDeliveryOffer(data.offer);
    return offer ? { type: 'ORDER_OFFERED', offer } : null;
  }
  if (data.type === 'OFFER_EXPIRED' && typeof data.orderId === 'string') {
    return { type: 'OFFER_EXPIRED', orderId: data.orderId };
  }
  return null;
}

/**
 * Validates the fields the session cannot do without — ids, coordinates, the
 * deadline. Everything else is display-only and tolerated missing; the
 * mapper below substitutes labels for it.
 */
export function parseDeliveryOffer(value: unknown): DeliveryOffer | null {
  if (typeof value !== 'object' || value === null) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.orderId !== 'string' ||
    typeof data.pickupLatitude !== 'number' ||
    typeof data.pickupLongitude !== 'number' ||
    typeof data.dropoffLatitude !== 'number' ||
    typeof data.dropoffLongitude !== 'number' ||
    typeof data.expiresInMs !== 'number'
  ) {
    return null;
  }
  return data as unknown as DeliveryOffer;
}

/**
 * Maps a backend offer onto the `Order` shape the offer card, active-order
 * sheet and pickup-code screen render.
 *
 * `deliveryId` follows the offer's own field: `null` for a pending offer, set
 * once the accept response is mapped through here again (`session-context`
 * does exactly that, so the accepted order is one mapping of the accept
 * response rather than a patched copy of the offer). `expectedArrival` is a
 * clock time computed from both ETAs at mapping time — good enough for the
 * header of the sheet, which is what it feeds.
 */
export function toSessionOrder(offer: DeliveryOffer, courierPosition: LatLng): Order {
  const pickup = { latitude: offer.pickupLatitude, longitude: offer.pickupLongitude };
  const dropoff = { latitude: offer.dropoffLatitude, longitude: offer.dropoffLongitude };
  const etaToStore = offer.etaToPickupMinutes ?? 0;
  const etaToCustomer = offer.etaToDropoffMinutes ?? 0;
  // Deadline in local clock terms, from the server-measured remaining time —
  // `Date.parse(offer.expiresAt)` would silently trust the phone's clock.
  const expiresAt = Date.now() + Math.max(0, offer.expiresInMs);

  return {
    reference: offer.orderId.replace(/-/g, '').slice(0, 8).toUpperCase(),
    orderId: offer.orderId,
    deliveryId: offer.deliveryId ?? null,
    totalTnd: offer.total ?? 0,
    riderEarningsTnd: typeof offer.driverEarnings === 'number' ? offer.driverEarnings : null,
    paymentMethod: paymentMethodOf(offer.paymentMethod),
    durationMinutes: etaToStore + etaToCustomer,
    distanceKm: offer.distanceKm ?? 0,
    minutesToPickup: etaToStore,
    expectedArrival: clockTime(Date.now() + (etaToStore + etaToCustomer) * 60_000),
    arrivedAt: '',
    expiresAt,
    countdownMs: Math.max(1, offer.expiresInMs),
    store: {
      name: offer.restaurantName?.trim() || 'Restaurant',
      address: offer.pickupAddress?.trim() || 'Address unavailable',
      phone: '',
      coordinate: pickup,
    },
    customer: {
      name: offer.customerName?.trim() || 'Customer',
      address: offer.dropoffAddress?.trim() || 'Address unavailable',
      phone: '',
      areaLabel: areaOf(offer.dropoffAddress),
      coordinate: dropoff,
    },
    items: (offer.items ?? []).map((item, index) => ({
      id: `${offer.orderId}-${index}`,
      quantity: item.quantity,
      name: item.name?.trim() || 'Item',
    })),
    // Straight lines, not road-following geometry — real turn-by-turn guidance
    // (`startNavigation` in delivery.tsx) calls the Google Directions API
    // separately once the driver taps Navigate. These only feed the
    // pre-navigation map preview (origin/destination + a drawn line).
    routeToStore: [courierPosition, pickup],
    routeToCustomer: [pickup, dropoff],
    etaToStoreMinutes: etaToStore,
    etaToCustomerMinutes: etaToCustomer,
  };
}

/**
 * The offer card only shows the customer's *area* before the driver accepts —
 * the last comma-separated part of a formatted address is the neighbourhood /
 * city in the formats the backend produces ("12 Rue X, Sahloul, Sousse").
 */
function areaOf(address: string | null | undefined): string {
  if (!address) return 'Customer area';
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'Customer area';
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

function paymentMethodOf(value: string | null | undefined): Order['paymentMethod'] {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'CASH') return 'cash';
  if (normalized === 'ONLINE' || normalized === 'CARD') return 'online';
  return null;
}

export function clockTime(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
