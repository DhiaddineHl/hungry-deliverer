import { apiClient } from './client';

/**
 * Where the deliverer app toggles online/offline
 * (`DriverAvailabilityController`).
 *
 * Going online requires a current position: the backend writes the whole
 * live-driver record (GEO position included) in one call, and there is
 * nothing to fall back to for a driver who was previously offline — see that
 * controller's javadoc. The app is expected to already have a device
 * location by the time "Go online" is tappable (`use-driver-location.ts`
 * starts watching as soon as permission is granted, independent of online
 * state, for exactly this reason).
 */

export interface AvailabilityPayload {
  available: boolean;
  /** Required when `available` is true; ignored when going offline. */
  latitude?: number;
  longitude?: number;
}

export async function setDriverAvailability(payload: AvailabilityPayload): Promise<void> {
  await apiClient.put('/drivers/me/availability', payload);
}
