import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { COURIER_START } from '@/data/mock';
import type { LatLng } from '@/features/session/types';
import { reportDriverLocation } from '@/services/api/driver-location-service';

/**
 * Continuous GPS tracking + reporting — replaces the old `useCourierLocation`,
 * which fetched one fix and then discarded it (the map puck was always the
 * hardcoded `COURIER_START` mock).
 *
 * Watching starts as soon as foreground permission is granted, independent of
 * `reportEnabled`: `session-context.tsx`'s "go online" action needs a current
 * position to send WITH the availability call (`PUT /drivers/me/availability`
 * requires one — see that endpoint's javadoc), so a position has to exist
 * before the driver ever goes online, not just after. Reporting to the
 * backend (`POST /api/drivers/{id}/location`) is the part gated by
 * `reportEnabled` — there is no reason to spend battery/network telling the
 * backend about a driver who isn't dispatchable.
 *
 * Foreground-only for this pass — background location (`expo-task-manager`)
 * would keep reporting with the app backgrounded, which a real fleet app
 * needs eventually but is a genuinely separate, larger change (a background
 * task, a persistent notification on Android, different permission prompts).
 */

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5_000,
  distanceInterval: 20,
};

export interface UseDriverLocationOptions {
  driverId: string | null | undefined;
  /** Only report to the backend while true (see the module doc above). */
  reportEnabled: boolean;
}

export interface UseDriverLocationResult {
  granted: boolean;
  /** The device's real live position, or `null` before the first fix arrives. */
  location: LatLng | null;
  /** `location`, falling back to the Sousse demo start point until the first fix. */
  courier: LatLng;
}

export function useDriverLocation({
  driverId,
  reportEnabled,
}: UseDriverLocationOptions): UseDriverLocationResult {
  const [granted, setGranted] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setGranted(true);
    })().catch(() => {
      // Nothing to fall back to but the demo start point — see `courier` below.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!granted) return;

    let cancelled = false;

    Location.watchPositionAsync(WATCH_OPTIONS, (position) => {
      if (cancelled) return;
      const next: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(next);

      if (reportEnabled && driverId) {
        reportDriverLocation(driverId, next.latitude, next.longitude).catch((error) => {
          console.warn('[Location] Could not report position:', error);
        });
      }
    })
      .then((subscription) => {
        if (cancelled) {
          subscription.remove();
          return;
        }
        subscriptionRef.current = subscription;
      })
      .catch(() => {
        // Same fallback as the initial permission request above.
      });

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [granted, reportEnabled, driverId]);

  return { granted, location, courier: location ?? COURIER_START };
}
