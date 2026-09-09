import { apiClient } from './client';

/**
 * Live GPS reporting against the gateway
 * (`assignment.infrastructure.adapter.rest.DriverLocationController`) — writes
 * straight to the backend's Redis GEO driver registry, no intermediate queue.
 *
 * `driverId` must be the CALLER's own `Driver.id` — the endpoint verifies
 * this server-side (`DriverIdentityService.assertOwnDriver`) and answers 403
 * for a mismatch, closing what used to be an open spoofing gap.
 */
export async function reportDriverLocation(
  driverId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  await apiClient.post(`/api/drivers/${encodeURIComponent(driverId)}/location`, {
    latitude,
    longitude,
  });
}
