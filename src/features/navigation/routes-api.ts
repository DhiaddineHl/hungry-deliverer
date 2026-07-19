import { decodePolyline } from '@/features/navigation/polyline';
import type { LatLng } from '@/features/session/types';

/** A single turn-by-turn step, normalised from the Routes API response. */
export type NavStep = {
  /** Full instruction, e.g. "Turn right onto Av. Ibn El Jazzar". */
  instruction: string;
  /** Routes API manoeuvre enum, e.g. "TURN_RIGHT" — mapped to an icon in the UI. */
  maneuver: string;
  /** Length of this step, in metres. */
  distanceMeters: number;
};

export type NavRoute = {
  /** Full route geometry, for drawing and following. */
  path: LatLng[];
  steps: NavStep[];
  distanceMeters: number;
  durationSeconds: number;
};

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const FIELD_MASK = [
  'routes.distanceMeters',
  'routes.duration',
  'routes.polyline.encodedPolyline',
  'routes.legs.steps.distanceMeters',
  'routes.legs.steps.navigationInstruction',
].join(',');

type RoutesResponse = {
  routes?: {
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
    legs?: {
      steps?: {
        distanceMeters?: number;
        navigationInstruction?: { maneuver?: string; instructions?: string };
      }[];
    }[];
  }[];
  error?: { message?: string; status?: string };
};

/** "1234s" → 1234 */
function parseDuration(value: string | undefined): number {
  if (!value) return 0;
  return parseInt(value.replace('s', ''), 10) || 0;
}

/**
 * Asks the Routes API for a driving route with turn-by-turn steps. Requires the
 * "Routes API" to be enabled on the Google Cloud project that owns the key.
 */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
): Promise<NavRoute> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
      destination: {
        location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'en-US',
      units: 'METRIC',
    }),
  });

  const data: RoutesResponse = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `Routes API error (${response.status})`);
  }

  const route = data.routes?.[0];
  const encoded = route?.polyline?.encodedPolyline;
  if (!route || !encoded) {
    throw new Error('No route found between these points.');
  }

  const steps: NavStep[] = (route.legs ?? [])
    .flatMap((leg) => leg.steps ?? [])
    .map((step) => ({
      instruction: step.navigationInstruction?.instructions ?? 'Continue',
      maneuver: step.navigationInstruction?.maneuver ?? 'STRAIGHT',
      distanceMeters: step.distanceMeters ?? 0,
    }));

  return {
    path: decodePolyline(encoded),
    steps,
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseDuration(route.duration),
  };
}
