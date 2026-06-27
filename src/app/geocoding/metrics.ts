export interface DistanceMetrics {
  euclideanM: number;
  haversineM: number;
  averageM: number;
}

const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEG_LAT = 111_320;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convierte Δlon/Δlat a metros en plano local (x = este, y = norte). */
function toLocalMeters(
  refLon: number,
  refLat: number,
  resLon: number,
  resLat: number,
): { x: number; y: number } {
  const meanLat = (refLat + resLat) / 2;
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(toRad(meanLat));
  return {
    x: (resLon - refLon) * metersPerDegLon,
    y: (resLat - refLat) * METERS_PER_DEG_LAT,
  };
}

/**
 * Distancia euclidiana en metros: d = √(Δx² + Δy²)
 * con x,y en coordenadas métricas locales.
 */
export function euclideanMeters(
  refLon: number,
  refLat: number,
  resLon: number,
  resLat: number,
): number {
  const { x, y } = toLocalMeters(refLon, refLat, resLon, resLat);
  return Math.hypot(x, y);
}

/**
 * Haversine: a = sin²(Δφ/2) + cos(φ1)cos(φ2)sin²(Δλ/2); d = 2R·arcsin(√a)
 */
export function haversineMeters(
  refLon: number,
  refLat: number,
  resLon: number,
  resLat: number,
): number {
  const φ1 = toRad(refLat);
  const φ2 = toRad(resLat);
  const Δφ = toRad(resLat - refLat);
  const Δλ = toRad(resLon - refLon);
  const a = Math.min(
    1,
    Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2,
  );
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}

export function distanceMetrics(
  refLon: number,
  refLat: number,
  resLon: number,
  resLat: number,
): DistanceMetrics {
  const euclideanM = euclideanMeters(refLon, refLat, resLon, resLat);
  const haversineM = haversineMeters(refLon, refLat, resLon, resLat);
  return {
    euclideanM,
    haversineM,
    averageM: (euclideanM + haversineM) / 2,
  };
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
