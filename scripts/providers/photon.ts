import type { GeocodeResult, GeocoderProvider } from '../types';

const PHOTON_BASE = 'https://photon.komoot.io/api';
/** Bbox Uruguay aproximado: minLon, minLat, maxLon, maxLat */
const UY_BBOX = '-58.45,-35.2,-53.0,-30.0';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function formatDisplayName(p: PhotonFeature['properties']): string {
  const parts = [
    p.name,
    p.housenumber && p.street ? `${p.street} ${p.housenumber}` : p.street,
    p.city ?? p.state,
    p.country,
  ].filter(Boolean);
  return parts.join(', ') || 'Sin nombre';
}

export class PhotonProvider implements GeocoderProvider {
  readonly name = 'photon';

  async geocode(query: string): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      q: query,
      limit: '1',
      lat: '-34.9011',
      lon: '-56.1645',
      bbox: UY_BBOX,
    });

    const response = await fetch(`${PHOTON_BASE}?${params}`);
    if (!response.ok) {
      throw new Error(`Photon HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as PhotonResponse;
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lon, lat] = feature.geometry.coordinates;
    return {
      lon,
      lat,
      displayName: formatDisplayName(feature.properties),
      raw: feature,
    };
  }
}
