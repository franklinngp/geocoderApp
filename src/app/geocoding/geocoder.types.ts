export type GeocoderId = 'nominatim' | 'photon' | 'arcgis' | 'sudir';

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

export interface GeocoderCompareResult {
  geocoderId: GeocoderId;
  hit: GeocodeHit | null;
  error: string | null;
  /** Tiempo de respuesta de la API en milisegundos */
  elapsedMs: number;
  /** Error en metros: resultado del geocoder vs coordenadas CSV de referencia */
  distanceM?: number | null;
}

export interface GeocodingProgress {
  step: number;
  total: number;
  geocoderId: GeocoderId;
  waiting: boolean;
  batchIndex?: number;
  batchTotal?: number;
  batchName?: string;
}

export interface BatchProgress {
  index: number;
  total: number;
  name: string;
}
