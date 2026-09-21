import { apiClient, isApiError } from './client';
import type { DeliveryOffer } from './types';

/**
 * The driver's side of an order: answer an offer, then report pickup and
 * drop-off on the delivery that answering created.
 *
 * Offers (`DriverOfferController`) are keyed by order, not delivery — there
 * is no `Delivery` row until the driver accepts. The caller's driver identity
 * is resolved server-side from the token, so nothing here sends a driver id
 * for the offer calls. Status updates (`DriverDeliveryStatusController`) still
 * take one, and the backend checks it against both the token and the
 * delivery's assigned driver.
 */

/** delivery.hungry.delivery.application.model.DeliveryStatus, the driver-facing subset. */
export type DeliveryStatus = 'PICKED_UP' | 'DELIVERED';

/**
 * The offer waiting on the caller, or `null` when there is none. Called when
 * the app comes back to the foreground while looking for orders — an
 * `ORDER_OFFERED` frame sent while the socket was closed is not replayed.
 */
export async function fetchCurrentOffer(): Promise<DeliveryOffer | null> {
  try {
    const { data } = await apiClient.get<DeliveryOffer>('/api/offers/current');
    return data;
  } catch (error) {
    if (isApiError(error, 404)) return null;
    throw error;
  }
}

/**
 * Accepts the offer. The backend creates the `Delivery` and answers with the
 * same offer details, now carrying its `deliveryId`. A 409 means the offer is
 * no longer on the table — it expired, or was already answered.
 */
export async function acceptOffer(orderId: string): Promise<DeliveryOffer> {
  const { data } = await apiClient.post<DeliveryOffer>(
    `/api/offers/${encodeURIComponent(orderId)}/accept`
  );
  return data;
}

/**
 * Declines the offer; the backend requeues the order for another driver. It
 * does NOT put the caller back in the available pool — the engine removed
 * them when it matched them — so the session re-registers availability
 * itself afterwards. A 409 (already gone) is not an error worth surfacing:
 * the outcome the driver wanted has already happened.
 */
export async function declineOffer(orderId: string): Promise<void> {
  try {
    await apiClient.post(`/api/offers/${encodeURIComponent(orderId)}/decline`);
  } catch (error) {
    if (isApiError(error, 409)) return;
    throw error;
  }
}

/**
 * Reports pickup or delivery. `latitude`/`longitude` are sent because the
 * endpoint's payload shape asks for them, even though nothing on the backend
 * currently reads them back out (`DriverDeliveryStatusController` only acts
 * on `status`) — sent anyway so the payload is correct the day that changes.
 * A 409 means the delivery is not in a status this one can follow.
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  driverId: string,
  orderId: string,
  status: DeliveryStatus,
  position: { latitude: number; longitude: number }
): Promise<void> {
  await apiClient.post(`/api/deliveries/${encodeURIComponent(deliveryId)}/status`, {
    orderId,
    driverId,
    status,
    latitude: position.latitude,
    longitude: position.longitude,
  });
}
