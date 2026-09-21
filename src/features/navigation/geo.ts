import type { LatLng } from '@/features/session/types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance between two points, in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a to b, in degrees clockwise from north (0–360). */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export type Segment = { start: LatLng; end: LatLng; length: number; cumulative: number };

/** Splits a polyline into segments annotated with length and running distance. */
export function buildSegments(path: LatLng[]): { segments: Segment[]; total: number } {
  const segments: Segment[] = [];
  let cumulative = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const length = haversine(path[i], path[i + 1]);
    segments.push({ start: path[i], end: path[i + 1], length, cumulative });
    cumulative += length;
  }

  return { segments, total: cumulative };
}

/** Position and heading at a given distance travelled along the segmented path. */
export function locateAlong(
  segments: Segment[],
  total: number,
  travelled: number,
): { position: LatLng; heading: number } {
  if (segments.length === 0) {
    return { position: { latitude: 0, longitude: 0 }, heading: 0 };
  }

  const clamped = Math.max(0, Math.min(travelled, total));
  let segment = segments[segments.length - 1];
  for (const candidate of segments) {
    if (clamped <= candidate.cumulative + candidate.length) {
      segment = candidate;
      break;
    }
  }

  const into = segment.length === 0 ? 0 : (clamped - segment.cumulative) / segment.length;
  const position: LatLng = {
    latitude: segment.start.latitude + (segment.end.latitude - segment.start.latitude) * into,
    longitude: segment.start.longitude + (segment.end.longitude - segment.start.longitude) * into,
  };

  return { position, heading: bearing(segment.start, segment.end) };
}

/**
 * Snaps a live GPS fix onto the route: the running distance along the path of
 * the nearest point on it, plus how far off the path the fix actually is.
 * Equirectangular projection per segment — at delivery-trip scale (a few km)
 * the error is centimetres, and it keeps this cheap enough to run on every
 * position tick.
 */
export function projectOnto(
  segments: Segment[],
  point: LatLng,
): { travelled: number; snapped: LatLng; distanceFromRoute: number } {
  if (segments.length === 0) {
    return { travelled: 0, snapped: point, distanceFromRoute: 0 };
  }

  const cosLat = Math.cos(toRad(point.latitude));
  const x = (p: LatLng) => toRad(p.longitude) * cosLat * EARTH_RADIUS_M;
  const y = (p: LatLng) => toRad(p.latitude) * EARTH_RADIUS_M;
  const px = x(point);
  const py = y(point);

  let best = { travelled: 0, snapped: segments[0].start, distanceFromRoute: Infinity };
  for (const segment of segments) {
    const ax = x(segment.start);
    const ay = y(segment.start);
    const bx = x(segment.end);
    const by = y(segment.end);
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
    const sx = ax + dx * t;
    const sy = ay + dy * t;
    const distance = Math.hypot(px - sx, py - sy);
    if (distance < best.distanceFromRoute) {
      best = {
        travelled: segment.cumulative + segment.length * t,
        snapped: {
          latitude: segment.start.latitude + (segment.end.latitude - segment.start.latitude) * t,
          longitude: segment.start.longitude + (segment.end.longitude - segment.start.longitude) * t,
        },
        distanceFromRoute: distance,
      };
    }
  }
  return best;
}
