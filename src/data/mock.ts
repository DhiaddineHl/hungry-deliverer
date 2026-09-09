import type { BusyPlace, Hotspot, LatLng } from '@/features/session/types';

/**
 * What's left here after the dispatch integration: pure UI decoration with no
 * backend equivalent to fetch instead of — a "demand heatmap" feature
 * (hotspots/busy places) that was never part of the mock offer flow, and the
 * map's static fallback starting point. The offer itself (`MOCK_ORDER`) and
 * its timers are gone — see `features/session/session-context.tsx` and
 * `features/session/order-mapper.ts` for the real replacement.
 */

/** Sousse, Tunisia — the city the frames are drawn over. Fallback center until a real GPS fix arrives. */
export const COURIER_START: LatLng = { latitude: 35.8286, longitude: 10.5942 };

export const INITIAL_REGION = {
  ...COURIER_START,
  latitudeDelta: 0.028,
  longitudeDelta: 0.022,
};

/** Demand pills scattered around the courier on the Home / Finding frames. */
export const HOTSPOTS: Hotspot[] = [
  { id: 'h1', level: 'busy', coordinate: { latitude: 35.8395, longitude: 10.5875 } },
  { id: 'h2', level: 'quiet', coordinate: { latitude: 35.8402, longitude: 10.6008 } },
  { id: 'h3', level: 'busy', coordinate: { latitude: 35.8358, longitude: 10.5885 } },
  { id: 'h4', level: 'moderate', coordinate: { latitude: 35.8331, longitude: 10.5985 } },
  { id: 'h5', level: 'quiet', coordinate: { latitude: 35.8305, longitude: 10.5878 } },
  { id: 'h6', level: 'busy', coordinate: { latitude: 35.8287, longitude: 10.6002 } },
  { id: 'h7', level: 'moderate', coordinate: { latitude: 35.8262, longitude: 10.5862 } },
  { id: 'h8', level: 'quiet', coordinate: { latitude: 35.8241, longitude: 10.6024 } },
];

/** Cards in the "Nearest Busy Place" carousel on the Finding Orders frame. */
export const BUSY_PLACES: BusyPlace[] = [
  {
    id: 'b1',
    name: 'Near Tennis Club of Sousse',
    distanceKm: 1.2,
    description: 'Busy hotspot zone',
    coordinate: { latitude: 35.8287, longitude: 10.6002 },
  },
  {
    id: 'b2',
    name: 'Near Sousse Corniche',
    distanceKm: 2.5,
    description: 'Busy hotspot zone',
    coordinate: { latitude: 35.8395, longitude: 10.5875 },
  },
  {
    id: 'b3',
    name: 'Near Sousse Olympic Stadium',
    distanceKm: 3.1,
    description: 'Moderate hotspot zone',
    coordinate: { latitude: 35.8358, longitude: 10.5885 },
  },
];

/** How long the driver has to accept an offer before it auto-declines. */
export const OFFER_COUNTDOWN_MS = 20_000;
