import type { LatLng, SessionState } from '@/features/session/types';

export type MapFocus = {
  /** The courier's own puck is only drawn while idle / hunting — a leg's origin dot takes over after. */
  showCourier: boolean;
  route: LatLng[];
  origin: LatLng | null;
  destination: LatLng | null;
  etaMinutes: number | null;
  /** Where the blue "3 min" bubble sits along the route. */
  etaCoordinate: LatLng | null;
};

const EMPTY: MapFocus = {
  showCourier: true,
  route: [],
  origin: null,
  destination: null,
  etaMinutes: null,
  etaCoordinate: null,
};

function midpointOf(route: LatLng[]): LatLng | null {
  if (route.length === 0) return null;
  return route[Math.floor(route.length / 2)];
}

/**
 * Derives what the map draws from the session state. The map itself stays
 * mounted across every phase — only this description of it changes.
 */
export function getMapFocus(state: SessionState): MapFocus {
  const { phase, order, previewedLeg } = state;

  if (!order || phase === 'offline' || phase === 'finding') {
    return EMPTY;
  }

  const showsCustomerLeg =
    phase === 'toCustomer' ||
    phase === 'completed' ||
    (phase === 'offer' && previewedLeg === 'customer');

  const route = showsCustomerLeg ? order.routeToCustomer : order.routeToStore;

  return {
    showCourier: false,
    route,
    origin: route[0] ?? null,
    destination: route[route.length - 1] ?? null,
    etaMinutes: showsCustomerLeg ? order.etaToCustomerMinutes : order.etaToStoreMinutes,
    etaCoordinate: midpointOf(route),
  };
}
