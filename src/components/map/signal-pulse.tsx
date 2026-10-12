import { memo, useEffect, useState } from "react";
import { Circle } from "react-native-maps";
import { useReducedMotion } from "react-native-reanimated";

import type { LatLng } from "@/features/session/types";
import { useColors, withAlpha } from "@/theme";

const RINGS = 3;
/** One full sweep of a ring, ms. */
const PERIOD = 3600;
/** How far a ring travels before fading out, metres. */
const MAX_RADIUS = 640;
const MIN_RADIUS = 12;
const FRAME_MS = 1000 / 30;

/**
 * Radar rings rippling out from the driver while the app is looking for
 * orders. Orange, because it is a signal ("searching"), not an action.
 *
 * Drawn as native map circles rather than an animated marker view: on Android
 * a custom marker is rasterised to a bitmap that is only re-snapshotted on a
 * layout pass, so a transform/opacity animation inside it freezes on its first
 * frame. A circle's radius and colour are native overlay props that update
 * without any rasterising, and a ~30 fps JS tick on three of them is well
 * below anything the map notices. The radius is in metres, so the signal
 * scales with the map instead of sitting at a fixed pixel size.
 */
export const SignalPulse = memo(function SignalPulse({
  coordinate,
}: {
  coordinate: LatLng;
}) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Under Reduce Motion the rings hold still, mid-sweep.
    if (reduceMotion) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - start), FRAME_MS);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <>
      {Array.from({ length: RINGS }, (_, index) => {
        // Rings are staggered a third of a period apart, so one is always mid-flight.
        const t = ((elapsed + (index * PERIOD) / RINGS) % PERIOD) / PERIOD;
        // Ease-out: the ring decelerates as it spreads, like a real ripple.
        const eased = 1 - (1 - t) * (1 - t);
        const fade = 1 - t;
        return (
          <Circle
            key={index}
            center={coordinate}
            radius={MIN_RADIUS + eased * (MAX_RADIUS - MIN_RADIUS)}
            strokeWidth={1.5}
            strokeColor={withAlpha(colors.primary, Number((fade * 0.55).toFixed(3)))}
            fillColor={withAlpha(colors.primary, Number((fade * 0.16).toFixed(3)))}
            zIndex={1}
          />
        );
      })}
    </>
  );
});
