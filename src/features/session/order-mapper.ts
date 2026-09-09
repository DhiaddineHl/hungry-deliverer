import type { AssignmentOffer } from '@/services/api/types';
import type { LatLng, Order } from './types';

/**
 * Parses hungry-notification's `ORDER_ASSIGNED` STOMP frame — the exact field
 * names `AssignmentNotificationDispatcher.notifyDriver` writes — into an
 * `AssignmentOffer`, or `null` for anything else on the topic (defensive:
 * nothing currently sends another `type` on `/topic/drivers/{id}/notifications`,
 * but a wire message is never trusted blindly).
 */
export function parseOrderAssignedPayload(payload: unknown): AssignmentOffer | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const data = payload as Record<string, unknown>;
  if (data.type !== 'ORDER_ASSIGNED') return null;

  const { deliveryId, orderId, pickupLat, pickupLon, dropoffLat, dropoffLon } = data;
  if (
    typeof deliveryId !== 'string' ||
    typeof orderId !== 'string' ||
    typeof pickupLat !== 'number' ||
    typeof pickupLon !== 'number' ||
    typeof dropoffLat !== 'number' ||
    typeof dropoffLon !== 'number'
  ) {
    return null;
  }

  return {
    deliveryId,
    orderId,
    pickup: { latitude: pickupLat, longitude: pickupLon },
    dropoff: { latitude: dropoffLat, longitude: dropoffLon },
  };
}

/**
 * Maps a real `ORDER_ASSIGNED` offer onto the `Order` shape the existing UI
 * (`OfferCard`, `ActiveOrderSheet`, `order-number.tsx`) expects.
 *
 * Every field that isn't a coordinate or an id below is a labelled
 * placeholder, not a fabricated real value — see `AssignmentOffer`'s javadoc
 * for exactly what the backend does and doesn't send. Reshaping the UI to
 * treat restaurant/customer name, phone, items and payout as optional
 * (rather than backfilling them here) is the more correct long-term fix, but
 * a much larger one — it touches every screen that reads `Order` — so it is
 * deliberately not done in this pass. Fixing the backend gap instead
 * (denormalising restaurant/customer contact details into the Assignment
 * Queue entry, the same way push tokens already are) is the natural next
 * step, and would make this function's placeholders the only thing to
 * update.
 */
export function toSessionOrder(offer: AssignmentOffer, courierPosition: LatLng): Order {
  return {
    reference: offer.orderId.replace(/-/g, '').slice(0, 8).toUpperCase(),
    deliveryId: offer.deliveryId,
    orderId: offer.orderId,
    payoutTnd: 0,
    totalTnd: 0,
    durationMinutes: 0,
    distanceKm: 0,
    minutesToPickup: 0,
    expectedArrival: '',
    arrivedAt: '',
    store: {
      name: 'Restaurant',
      address: 'Address unavailable',
      phone: '',
      coordinate: offer.pickup,
    },
    customer: {
      name: 'Customer',
      address: 'Address unavailable',
      phone: '',
      areaLabel: '',
      coordinate: offer.dropoff,
    },
    items: [],
    // Straight lines, not road-following geometry — real turn-by-turn guidance
    // (`startNavigation` in delivery.tsx) calls the Google Directions API
    // separately once the driver taps Navigate. These only feed the
    // pre-navigation map preview (origin/destination + a drawn line).
    routeToStore: [courierPosition, offer.pickup],
    routeToCustomer: [offer.pickup, offer.dropoff],
    etaToStoreMinutes: 0,
    etaToCustomerMinutes: 0,
  };
}
