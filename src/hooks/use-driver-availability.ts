import { useMutation } from '@tanstack/react-query';

import { setDriverAvailability, type AvailabilityPayload } from '@/services/api/driver-availability-service';

/**
 * TanStack mutation wrapper around `setDriverAvailability`. No cache
 * invalidation on success — availability is live Redis state, not part of
 * the `Driver` record TanStack Query already caches (`driverKeys`), so there
 * is nothing to keep in sync here.
 */
export function useDriverAvailability() {
  return useMutation({
    mutationFn: (payload: AvailabilityPayload) => setDriverAvailability(payload),
  });
}
