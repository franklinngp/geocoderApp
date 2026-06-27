import type { ErrorMetrics } from './types';

const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEG_LAT = 111_320;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia haversine en metros entre dos puntos WGS84 (lon, lat). */
export function haversineMeters(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.min(
    1,
    Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2,
  );
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}

/** Distancia euclidiana en metros usando aproximación plana local. */
export function euclideanMeters(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const meanLat = (lat1 + lat2) / 2;
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(toRad(meanLat));
  const dx = (lon2 - lon1) * metersPerDegLon;
  const dy = (lat2 - lat1) * METERS_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/** Vector de error ref → resultado (este/norte en m, bearing desde el norte). */
export function errorVector(
  refLon: number,
  refLat: number,
  resLon: number,
  resLat: number,
): ErrorMetrics {
  const meanLat = (refLat + resLat) / 2;
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(toRad(meanLat));
  const deltaEast = (resLon - refLon) * metersPerDegLon;
  const deltaNorth = (resLat - refLat) * METERS_PER_DEG_LAT;
  const bearingRad = Math.atan2(deltaEast, deltaNorth);
  const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

  return {
    error_m: haversineMeters(refLon, refLat, resLon, resLat),
    euclidean_m: euclideanMeters(refLon, refLat, resLon, resLat),
    bearing_deg: bearingDeg,
    delta_east_m: deltaEast,
    delta_north_m: deltaNorth,
  };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
