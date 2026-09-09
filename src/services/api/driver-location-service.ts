import { publishToDestination } from '@/services/realtime/stomp-client';

/**
 * Live GPS reporting over the same shared STOMP connection
 * `subscribeToTopic`/`session-context.tsx` already hold open, instead of a
 * dedicated REST call — the backend's WS `LocationController`
 * (`delivery.hungry.location`) ingests `/app/drivers/{driverId}/location`
 * SEND frames and writes straight to the Redis GEO driver registry, no
 * intermediate queue.
 *
 * `driverId` must be the CALLER's own `Driver.id` — the backend verifies this
 * server-side (`DriverIdentityService.assertOwnDriver`) against the identity
 * on the STOMP session's CONNECT frame. Unlike the old REST endpoint's 403,
 * a mismatch here is silently dropped (logged server-side) rather than
 * surfaced to the caller — an accepted limitation of fire-and-forget WS
 * ingestion for a frequent position ping.
 *
 * Kept as an `async` function with the same signature as before so
 * `use-driver-location.ts` needs no change at all: the publish itself is
 * synchronous (fire-and-forget over an already-open socket), so this
 * resolves immediately rather than waiting on a server round-trip.
 */
export async function reportDriverLocation(
  driverId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  publishToDestination(`/app/drivers/${encodeURIComponent(driverId)}/location`, {
    latitude,
    longitude,
  });
}
