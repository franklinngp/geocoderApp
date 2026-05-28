export type GeocoderId = 'nominatim' | 'photon' | 'arcgis';

export interface GeocoderOption {
  id: GeocoderId;
  label: string;
}

export interface GeocodeHit {
  lon: number;
  lat: number;
  displayName: string;
  /** west, south, east, north (EPSG:4326) para ajustar vista */
  extent?: [number, number, number, number];
}
