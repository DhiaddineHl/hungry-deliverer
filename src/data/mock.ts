import type { LatLng } from '@/features/session/types';

/**
 * What's left here after the dispatch integration: the map's static fallback
 * starting point. The offer itself (`MOCK_ORDER`) and its timers are gone (the
 * offer deadline now comes from the backend, per offer) —
 * see `features/session/session-context.tsx` and
 * `features/session/order-mapper.ts` for the real replacement — and so is the
 * "demand heatmap" decoration (hotspot pills / busy places), which had no
 * backend behind it.
 */

/** Sousse, Tunisia — the city the frames are drawn over. Fallback center until a real GPS fix arrives. */
export const COURIER_START: LatLng = { latitude: 35.8286, longitude: 10.5942 };

export const INITIAL_REGION = {
  ...COURIER_START,
  latitudeDelta: 0.028,
  longitudeDelta: 0.022,
};
