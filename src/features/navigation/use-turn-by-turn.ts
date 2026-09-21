import { useEffect, useMemo, useRef, useState } from 'react';

import { bearing, buildSegments, locateAlong, projectOnto } from '@/features/navigation/geo';
import type { NavRoute } from '@/features/navigation/routes-api';
import type { LatLng } from '@/features/session/types';

/**
 * Metres per second for the simulated courier, and how often it advances —
 * only used when there is no live GPS fix to follow (permission denied, or
 * running on a simulator with no location), so the route still plays out.
 */
const SIM_SPEED_MPS = 22;
const TICK_MS = 250;

/** Within this many metres of the polyline the puck is snapped onto it. */
const SNAP_RADIUS_METERS = 40;
/** Beyond this the driver has left the route and the caller should re-route. */
const OFF_ROUTE_METERS = 80;
/** Remaining distance under which the leg counts as done. */
const ARRIVAL_METERS = 30;

export type TurnByTurn = {
  position: LatLng;
  heading: number;
  /** Instruction for the manoeuvre the courier is approaching. */
  instruction: string;
  maneuver: string;
  /** Distance to that manoeuvre, in metres. */
  distanceToManeuver: number;
  remainingMeters: number;
  remainingSeconds: number;
  arrived: boolean;
  /** The live fix is further than `OFF_ROUTE_METERS` from the route — time to fetch a new one. */
  offRoute: boolean;
};

/**
 * Drives turn-by-turn guidance along a fetched route from the driver's real
 * position: each GPS fix is projected onto the polyline to find how far along
 * the route they are, which picks the current step, the distance to the next
 * manoeuvre and what is left. Progress never runs backwards on GPS jitter —
 * `travelled` is monotonic until a new route arrives.
 *
 * With no fix at all the old timer simulation takes over, so the screen still
 * works on a simulator.
 */
export function useTurnByTurn(
  route: NavRoute | null,
  active: boolean,
  location: LatLng | null,
): TurnByTurn | null {
  const { segments, total } = useMemo(
    () => (route ? buildSegments(route.path) : { segments: [], total: 0 }),
    [route],
  );

  // Step boundaries as running distances, scaled to the polyline length so the
  // step index and the drawn position stay in lock-step.
  const stepEnds = useMemo(() => {
    if (!route || route.steps.length === 0) return [];
    const stepTotal = route.steps.reduce((sum, s) => sum + s.distanceMeters, 0) || 1;
    let running = 0;
    return route.steps.map((step) => {
      running += step.distanceMeters;
      return (running / stepTotal) * total;
    });
  }, [route, total]);

  const [travelled, setTravelled] = useState(0);
  const travelledRef = useRef(0);
  const [activeRoute, setActiveRoute] = useState<NavRoute | null>(route);

  // A fresh route restarts the journey — reset the visible progress at render
  // time so it is zeroed before the first paint (the ref is reset in the effect,
  // where touching a ref is allowed).
  if (route !== activeRoute) {
    setActiveRoute(route);
    setTravelled(0);
  }

  // Live GPS: project each fix onto the route.
  const projection = useMemo(
    () => (location && segments.length > 0 ? projectOnto(segments, location) : null),
    [location, segments],
  );

  useEffect(() => {
    if (!active || !route || total === 0) return;
    if (!projection) return;
    // Monotonic: a fix that projects behind the last one is jitter, not reversing.
    const next = Math.max(travelledRef.current, Math.min(projection.travelled, total));
    travelledRef.current = next;
    setTravelled(next);
  }, [active, route, total, projection]);

  // Simulation fallback, only without a fix.
  useEffect(() => {
    if (!active || !route || total === 0 || location) return;

    travelledRef.current = 0;
    const id = setInterval(() => {
      travelledRef.current = Math.min(
        travelledRef.current + (SIM_SPEED_MPS * TICK_MS) / 1000,
        total,
      );
      setTravelled(travelledRef.current);
      if (travelledRef.current >= total) clearInterval(id);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [active, route, total, location]);

  // Reset progress when the route changes (kept out of render, ref-safe).
  useEffect(() => {
    travelledRef.current = 0;
  }, [route]);

  if (!route || total === 0) return null;

  const along = locateAlong(segments, total, travelled);
  const remainingMeters = Math.max(0, total - travelled);
  const arrived = remainingMeters <= ARRIVAL_METERS || travelled >= total;

  // Draw the puck on the road while the fix is close to it, at the raw fix once
  // the driver has clearly left it — snapping then would lie about where they are.
  let position = along.position;
  let heading = along.heading;
  let offRoute = false;
  if (projection && location) {
    if (projection.distanceFromRoute > SNAP_RADIUS_METERS) {
      position = location;
      heading = bearing(location, projection.snapped);
    }
    offRoute = !arrived && projection.distanceFromRoute > OFF_ROUTE_METERS;
  }

  let stepIndex = stepEnds.findIndex((end) => travelled < end);
  if (stepIndex === -1) stepIndex = route.steps.length - 1;
  const step = route.steps[stepIndex];

  return {
    position,
    heading,
    instruction: arrived ? 'You have arrived' : (step?.instruction ?? 'Continue'),
    maneuver: arrived ? 'DESTINATION' : (step?.maneuver ?? 'STRAIGHT'),
    distanceToManeuver: Math.max(0, (stepEnds[stepIndex] ?? total) - travelled),
    remainingMeters,
    remainingSeconds: route.durationSeconds * (total === 0 ? 0 : remainingMeters / total),
    arrived,
    offRoute,
  };
}
