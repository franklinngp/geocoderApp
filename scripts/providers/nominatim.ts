import type { GeocodeResult, GeocoderProvider } from '../types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GeocoderApp-TSIG/1.0 (geocoder comparison study)';

interface NominatimHit {
  lat: string;
  lon: string;
  display_name?: string;
  importance?: number;
}

export class NominatimProvider implements GeocoderProvider {
  readonly name = 'nominatim';

  async geocode(query: string): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'uy',
    });

    const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as NominatimHit[];
    if (!data?.length) return null;

    const hit = data[0]!;
    return {
      lon: Number(hit.lon),
      lat: Number(hit.lat),
      displayName: hit.display_name,
      confidence: hit.importance,
      raw: hit,
    };
  }
}
