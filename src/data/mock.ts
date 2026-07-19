import type { BusyPlace, Hotspot, LatLng, Order } from '@/features/session/types';

/** Sousse, Tunisia — the city the frames are drawn over. */
export const COURIER_START: LatLng = { latitude: 35.8286, longitude: 10.5942 };

const STORE_COORD: LatLng = { latitude: 35.8365, longitude: 10.5987 };
const CUSTOMER_COORD: LatLng = { latitude: 35.8248, longitude: 10.5798 };

export const INITIAL_REGION = {
  ...COURIER_START,
  latitudeDelta: 0.028,
  longitudeDelta: 0.022,
};

/**
 * Stand-in for a Directions API response: the courier heads north up
 * Rue Abdelhamid Laskid, then east to the store on Av. Ibn El Jazzar.
 */
const ROUTE_TO_STORE: LatLng[] = [
  { latitude: 35.8286, longitude: 10.5942 },
  { latitude: 35.8299, longitude: 10.5939 },
  { latitude: 35.8322, longitude: 10.5943 },
  { latitude: 35.8345, longitude: 10.5951 },
  { latitude: 35.8358, longitude: 10.5956 },
  { latitude: 35.8366, longitude: 10.5962 },
  { latitude: 35.8369, longitude: 10.5974 },
  { latitude: 35.8365, longitude: 10.5987 },
];

/** Store → customer: south-west down Rue Mohamed Karoui into Cité Hached. */
const ROUTE_TO_CUSTOMER: LatLng[] = [
  { latitude: 35.8365, longitude: 10.5987 },
  { latitude: 35.8352, longitude: 10.5983 },
  { latitude: 35.8318, longitude: 10.5949 },
  { latitude: 35.8286, longitude: 10.5901 },
  { latitude: 35.8262, longitude: 10.5872 },
  { latitude: 35.8255, longitude: 10.5841 },
  { latitude: 35.8248, longitude: 10.5798 },
];

export const MOCK_ORDER: Order = {
  reference: '2043',
  payoutTnd: 24.5,
  totalTnd: 24.5,
  durationMinutes: 20,
  distanceKm: 3.5,
  minutesToPickup: 15,
  expectedArrival: '16h00',
  arrivedAt: '15h55',
  etaToStoreMinutes: 3,
  etaToCustomerMinutes: 4,
  store: {
    name: 'After Eight - Café & Resto',
    address: 'Av. IBN EL Jazzar, Sousse',
    phone: '99240548',
    coordinate: STORE_COORD,
  },
  customer: {
    name: 'Foulen Falteni',
    address: '2 Rue du Commandant Bejaoui, Sousse 4000',
    phone: '99240548',
    areaLabel: 'DIAGBENZ',
    coordinate: CUSTOMER_COORD,
  },
  items: [
    { id: 'i1', quantity: 1, name: 'Pizza au Thon' },
    { id: 'i2', quantity: 1, name: 'Malfouf Escalope Grillé' },
    { id: 'i3', quantity: 1, name: 'Escalope Panné' },
  ],
  routeToStore: ROUTE_TO_STORE,
  routeToCustomer: ROUTE_TO_CUSTOMER,
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

/** How long the courier has to accept before the offer auto-declines. */
export const OFFER_COUNTDOWN_MS = 20_000;
/** Simulated backend latency for the demo flow. */
export const TIME_TO_FIND_ORDER_MS = 3_000;
export const TIME_UNTIL_ORDER_READY_MS = 8_000;
