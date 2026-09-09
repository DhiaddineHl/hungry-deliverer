import { apiClient } from './client';

/**
 * Delivery writes against the gateway — accept/decline an assignment, and
 * report pickup/delivery progress.
 *
 * Both endpoints resolve the caller's driver identity server-side via
 * `DriverIdentityService.assertOwnDriver`, matching whatever `driverId` this
 * module sends against the account behind the caller's token — so the id
 * sent here must be the caller's OWN `Driver.id`, never one picked freely.
 */

export type DriverResponse = 'ACCEPTED' | 'REJECTED';

/** delivery.hungry.delivery.application.model.DeliveryStatus, the driver-facing subset. */
export type DeliveryStatus = 'PICKED_UP' | 'DELIVERED';

/**
 * Answers an assignment offer. On REJECTED the backend requeues the order
 * for another driver itself — nothing further to do here.
 */
export async function respondToDelivery(
  deliveryId: string,
  driverId: string,
  response: DriverResponse
): Promise<void> {
  await apiClient.post(`/api/deliveries/${encodeURIComponent(deliveryId)}/response`, {
    driverId,
    response,
  });
}

/**
 * Reports pickup or delivery. `latitude`/`longitude` are sent because the
 * endpoint's payload shape asks for them, even though nothing on the backend
 * currently reads them back out (`DriverDeliveryStatusController` only acts
 * on `status`) — sent anyway so the payload is correct the day that changes.
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
