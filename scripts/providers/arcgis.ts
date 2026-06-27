import type { GeocodeResult, GeocoderProvider } from '../types';

const ARCGIS_URL =
  'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';

interface ArcGisCandidate {
  address?: string;
  location?: { x: number; y: number };
  extent?: { xmin: number; ymin: number; xmax: number; ymax: number };
  score?: number;
}

interface ArcGisResponse {
  candidates?: ArcGisCandidate[];
}

export class ArcGisProvider implements GeocoderProvider {
  readonly name = 'arcgis';

  async geocode(query: string): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      f: 'json',
      singleLine: query,
      countryCode: 'UY',
      maxLocations: '1',
      outFields: 'Match_addr,Addr_type',
    });

    const response = await fetch(`${ARCGIS_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`ArcGIS HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as ArcGisResponse;
    const candidate = data.candidates?.[0];
    if (!candidate?.location) return null;

    return {
      lon: candidate.location.x,
      lat: candidate.location.y,
      displayName: candidate.address ?? query,
      confidence: candidate.score,
      raw: candidate,
    };
  }
}
