import { Injectable, signal } from '@angular/core';
import type { GeocodeHit, GeocoderId, GeocoderOption } from './geocoder.types';

export const GEOCODER_OPTIONS: GeocoderOption[] = [
  { id: 'nominatim', label: 'Nominatim (OSM)' },
  { id: 'photon', label: 'Photon (Komoot)' },
  { id: 'arcgis', label: 'ArcGIS (Esri)' },
];

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api';
const ARCGIS_URL =
  'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
/** Centro Montevideo: prioriza resultados en el área del estudio */
const MVD_LAT = '-34.9011';
const MVD_LON = '-56.1645';
const UY_BBOX = '-58.45,-35.2,-53.0,-30.0';

interface NominatimHit {
  lat: string;
  lon: string;
  display_name?: string;
  boundingbox?: string[];
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

interface ArcGisCandidate {
  address?: string;
  location?: { x: number; y: number };
  extent?: { xmin: number; ymin: number; xmax: number; ymax: number };
}

@Injectable({ providedIn: 'root' })
export class GeocoderService {
  readonly options = GEOCODER_OPTIONS;
  readonly selectedId = signal<GeocoderId>('nominatim');
  readonly searching = signal(false);

  setSelected(id: GeocoderId): void {
    this.selectedId.set(id);
  }

  async geocode(query: string): Promise<GeocodeHit | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    this.searching.set(true);
    try {
      switch (this.selectedId()) {
        case 'nominatim':
          return await this.geocodeNominatim(trimmed);
        case 'photon':
          return await this.geocodePhoton(trimmed);
        case 'arcgis':
          return await this.geocodeArcgis(trimmed);
      }
    } finally {
      this.searching.set(false);
    }
  }

  private async geocodeNominatim(query: string): Promise<GeocodeHit | null> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'uy',
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'Accept-Language': 'es',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as NominatimHit[];
    const hit = data[0];
    if (!hit) return null;

    let extent: GeocodeHit['extent'];
    if (hit.boundingbox?.length === 4) {
      const [south, north, west, east] = hit.boundingbox.map(Number);
      extent = [west, south, east, north];
    }

    return {
      lon: Number(hit.lon),
      lat: Number(hit.lat),
      displayName: hit.display_name ?? query,
      extent,
    };
  }

  private async geocodePhoton(query: string): Promise<GeocodeHit | null> {
    const params = new URLSearchParams({
      q: query,
      limit: '1',
      lat: MVD_LAT,
      lon: MVD_LON,
      bbox: UY_BBOX,
    });

    const response = await fetch(`${PHOTON_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`Photon: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { features: PhotonFeature[] };
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lon, lat] = feature.geometry.coordinates;
    const p = feature.properties;

    const parts = [
      p['name'],
      p['housenumber'] && p['street']
        ? `${p['street']} ${p['housenumber']}`
        : p['street'],
      p['city'] ?? p['state'],
      p['country'],
    ].filter(Boolean);

    return {
      lon,
      lat,
      displayName: parts.join(', ') || query,
    };
  }

  private async geocodeArcgis(query: string): Promise<GeocodeHit | null> {
    const params = new URLSearchParams({
      f: 'json',
      singleLine: query,
      countryCode: 'UY',
      maxLocations: '1',
    });

    const response = await fetch(`${ARCGIS_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`ArcGIS: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { candidates?: ArcGisCandidate[] };
    const candidate = data.candidates?.[0];
    if (!candidate?.location) return null;

    let extent: GeocodeHit['extent'];
    const e = candidate.extent;
    if (e) {
      extent = [e.xmin, e.ymin, e.xmax, e.ymax];
    }

    return {
      lon: candidate.location.x,
      lat: candidate.location.y,
      displayName: candidate.address ?? query,
      extent,
    };
  }
}
