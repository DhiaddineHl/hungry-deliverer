import { useEffect, useMemo, useRef, useState } from 'react';

import { buildSegments, locateAlong } from '@/features/navigation/geo';
import type { NavRoute } from '@/features/navigation/routes-api';
import type { LatLng } from '@/features/session/types';

/**
 * Metres per second for the simulated courier, and how often it advances.
 * Sped up beyond a real bike so the demo route plays out in a minute or two.
 */
const SIM_SPEED_MPS = 22;
const TICK_MS = 250;

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
};

/**
 * Drives turn-by-turn guidance along a fetched route. Today a timer simulates
 * the courier advancing down the polyline; to go live, replace `travelled` with
 * a projection of a real `Location.watchPositionAsync` fix onto the segments.
 */
export function useTurnByTurn(route: NavRoute | null, active: boolean): TurnByTurn | null {
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

  useEffect(() => {
    if (!active || !route || total === 0) return;

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
  }, [active, route, total]);

  if (!route || total === 0) return null;

  const { position, heading } = locateAlong(segments, total, travelled);
  const arrived = travelled >= total;

  let stepIndex = stepEnds.findIndex((end) => travelled < end);
  if (stepIndex === -1) stepIndex = route.steps.length - 1;
  const step = route.steps[stepIndex];

  const remainingMeters = Math.max(0, total - travelled);

  return {
    position,
    heading,
    instruction: arrived ? 'You have arrived' : (step?.instruction ?? 'Continue'),
    maneuver: arrived ? 'DESTINATION' : (step?.maneuver ?? 'STRAIGHT'),
    distanceToManeuver: Math.max(0, (stepEnds[stepIndex] ?? total) - travelled),
    remainingMeters,
    remainingSeconds: route.durationSeconds * (total === 0 ? 0 : remainingMeters / total),
    arrived,
  };
}
