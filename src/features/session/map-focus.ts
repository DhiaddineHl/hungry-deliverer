import type { LatLng, SessionState } from '@/features/session/types';

export type MapMarkerSpec = {
  kind: 'store' | 'customer';
  coordinate: LatLng;
  /** Name shown beside the pin once the trip is under way. */
  label?: string;
};

export type MapFocus = {
  /** The active leg, drawn solid. */
  route: LatLng[];
  /** The leg after it, drawn dashed — only while an offer is on the table. */
  nextRoute: LatLng[];
  markers: MapMarkerSpec[];
  /** Where Navigate takes the rider: the end of the active leg. */
  destination: LatLng | null;
  etaMinutes: number | null;
  /** Where the "3 min" chip sits along the active leg. */
  etaCoordinate: LatLng | null;
};

const EMPTY: MapFocus = {
  route: [],
  nextRoute: [],
  markers: [],
  destination: null,
  etaMinutes: null,
  etaCoordinate: null,
};

function midpointOf(route: LatLng[]): LatLng | null {
  if (route.length === 0) return null;
  if (route.length === 2) {
    return {
      latitude: (route[0].latitude + route[1].latitude) / 2,
      longitude: (route[0].longitude + route[1].longitude) / 2,
    };
  }
  return route[Math.floor(route.length / 2)];
}

/** "After Eight – Café & Resto" → "After Eight": map labels stay short. */
function shortName(name: string): string {
  return name.split(/\s[–-]\s/)[0].trim();
}

/**
 * Derives what the map draws from the session. The map stays mounted across
 * every phase; only this description of it changes.
 *
 *   offer      → leg to the store solid, leg to the customer dashed, both pins
 *   to store   → leg to the store, labelled store pin, ETA chip
 *   to customer→ leg to the customer, labelled customer pin, ETA chip
 */
export function getMapFocus(state: SessionState): MapFocus {
  const { phase, order } = state;
  if (!order || phase === 'offline' || phase === 'finding') return EMPTY;

  const store: MapMarkerSpec = { kind: 'store', coordinate: order.store.coordinate };
  const customer: MapMarkerSpec = { kind: 'customer', coordinate: order.customer.coordinate };

  if (phase === 'offer') {
    return {
      route: order.routeToStore,
      nextRoute: order.routeToCustomer,
      markers: [store, customer],
      destination: order.store.coordinate,
      etaMinutes: null,
      etaCoordinate: null,
    };
  }

  if (phase === 'toStore' || phase === 'orderReady') {
    return {
      route: order.routeToStore,
      nextRoute: [],
      markers: [{ ...store, label: shortName(order.store.name) }],
      destination: order.store.coordinate,
      etaMinutes: phase === 'toStore' ? order.etaToStoreMinutes : null,
      etaCoordinate: phase === 'toStore' ? midpointOf(order.routeToStore) : null,
    };
  }

  // toCustomer, completed
  return {
    route: order.routeToCustomer,
    nextRoute: [],
    markers: [{ ...customer, label: shortName(order.customer.name) }],
    destination: order.customer.coordinate,
    etaMinutes: phase === 'toCustomer' ? order.etaToCustomerMinutes : null,
    etaCoordinate: phase === 'toCustomer' ? midpointOf(order.routeToCustomer) : null,
  };
}
