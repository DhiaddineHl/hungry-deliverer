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
 * Nothing happens until `enabled`: no permission prompt and no GPS on the
 * sign-in screens. The provider that owns this hook wraps the whole app, so
 * without the gate the prompt fired on every app open, before anyone had
 * logged in. It is enabled once a deliverer is signed in AND the map screen is
 * open, and turning it back off (sign-out) stops the watch.
 *
 * Once enabled, watching starts as soon as foreground permission is granted,
 * independent of `reportEnabled`: `session-context.tsx`'s "go online" action needs a current
 * position to send WITH the availability call (`PUT /drivers/me/availability`
 * requires one — see that endpoint's javadoc), so a position has to exist
 * before the driver ever goes online, not just after. Reporting to the
 * backend (a STOMP publish over the shared connection — see
 * `driver-location-service.ts`) is the part gated by `reportEnabled` — there
 * is no reason to spend battery/network telling the backend about a driver
 * who isn't dispatchable.
 *
 * During a delivery (`tracking`) the same pings also drive the customer's
 * live map (the backend's `LiveDeliveryTrackingService`), which needs more
 * than a dispatch registry does:
 *   - a tighter watch — finer accuracy, no 20 m movement threshold, so the
 *     marker moves smoothly and a driver standing still still produces fixes;
 *   - one report the moment tracking starts, so the customer's map has a
 *     position right after the accept rather than after the first 20 m;
 *   - the last position re-sent every `TRACKING_HEARTBEAT_MS`. The backend
 *     forgets a delivery's position after ~2 min without a ping (so a dead
 *     phone never looks live); a driver waiting at the restaurant for the food
 *     must not look like one.
 *
 * Foreground-only for this pass — background location (`expo-task-manager`)
 * would keep reporting with the app backgrounded, which a real fleet app
 * needs eventually but is a genuinely separate, larger change (a background
 * task, a persistent notification on Android, different permission prompts).
 * See `hungry-customer/docs/plans/live-driver-tracking-plan.md` §3.6.
 */

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5_000,
  distanceInterval: 20,
};

/** While a delivery is being tracked by its customer. */
const TRACKING_WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 4_000,
  distanceInterval: 0,
};

/** Well inside the backend's ~2 min expiry of a delivery's last position. */
const TRACKING_HEARTBEAT_MS = 30_000;

export interface UseDriverLocationOptions {
  /** Master switch — see the module doc. While false, nothing is requested or watched. */
  enabled: boolean;
  driverId: string | null | undefined;
  /** Only report to the backend while true (see the module doc above). */
  reportEnabled: boolean;
  /**
   * A delivery is in progress (accepted, not yet delivered): its customer is
   * watching this position live. Tightens the watch and keeps the position
   * fresh — see the module doc. Only takes effect with `reportEnabled`.
   */
  tracking?: boolean;
}

export interface UseDriverLocationResult {
  granted: boolean;
  /** The device's real live position, or `null` before the first fix arrives. */
  location: LatLng | null;
  /** `location`, falling back to the Sousse demo start point until the first fix. */
  courier: LatLng;
}

function report(driverId: string, position: LatLng) {
  reportDriverLocation(driverId, position.latitude, position.longitude).catch((error) => {
    console.warn('[Location] Could not report position:', error);
  });
}

export function useDriverLocation({
  enabled,
  driverId,
  reportEnabled,
  tracking = false,
}: UseDriverLocationOptions): UseDriverLocationResult {
  const [granted, setGranted] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationRef = useRef<LatLng | null>(null);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const trackingActive = enabled && tracking && reportEnabled && !!driverId;

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !granted) return;

    let cancelled = false;
    let hasFix = false;

    // The watcher can take several seconds to deliver its first position. Seed
    // the marker from the last cached fix (instant, may be stale) and a fresh
    // one-shot read meanwhile, so the map centres on the driver right away.
    // `hasFix` stops either seed from overwriting a newer watcher tick.
    const seed = (position: Location.LocationObject | null) => {
      if (cancelled || hasFix || !position) return;
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };
    Location.getLastKnownPositionAsync().then(seed).catch(() => {});
    const watchOptions = trackingActive ? TRACKING_WATCH_OPTIONS : WATCH_OPTIONS;
    Location.getCurrentPositionAsync({ accuracy: watchOptions.accuracy })
      .then(seed)
      .catch(() => {});

    Location.watchPositionAsync(watchOptions, (position) => {
      if (cancelled) return;
      hasFix = true;
      const next: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(next);

      if (reportEnabled && driverId) {
        report(driverId, next);
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
  }, [enabled, granted, reportEnabled, driverId, trackingActive]);

  // While tracked: report once right away (the watcher may take a while to
  // fire, and not at all for a driver standing still), then keep re-sending
  // the latest position so it never expires on the backend mid-delivery.
  useEffect(() => {
    if (!trackingActive || !driverId) return;

    const sendLatest = () => {
      const latest = locationRef.current;
      if (latest) report(driverId, latest);
    };
    sendLatest();
    const timer = setInterval(sendLatest, TRACKING_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [trackingActive, driverId]);

  return { granted, location, courier: location ?? COURIER_START };
}
