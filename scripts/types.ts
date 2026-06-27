export interface QueryVariant {
  id: string;
  label: string;
  text: string;
}

export interface TestCase {
  id: string;
  name: string;
  ref_lon: number;
  ref_lat: number;
  street: string;
  housenumber: string;
  city: string;
  country: string;
  type: string;
  queries: QueryVariant[];
}

export interface CasosFile {
  generated_at: string;
  source: string;
  count: number;
  cases: TestCase[];
}

export interface GeocodeResult {
  lon: number;
  lat: number;
  displayName?: string;
  confidence?: number;
  raw?: unknown;
}

export interface GeocoderProvider {
  name: string;
  geocode(query: string): Promise<GeocodeResult | null>;
}

export interface ErrorMetrics {
  error_m: number;
  euclidean_m: number;
  bearing_deg: number;
  delta_east_m: number;
  delta_north_m: number;
}

export interface ComparisonRow {
  case_id: string;
  name: string;
  poi_type: string;
  query_id: string;
  query_text: string;
  geocoder: string;
  ref_lon: number;
  ref_lat: number;
  result_lon: number | null;
  result_lat: number | null;
  error_m: number | null;
  euclidean_m: number | null;
  bearing_deg: number | null;
  delta_east_m: number | null;
  delta_north_m: number | null;
  display_name: string | null;
  confidence: number | null;
  status: 'ok' | 'not_found' | 'error';
  error_message: string | null;
  elapsed_ms: number;
}

export interface ComparisonSummary {
  geocoder: string;
  run_at: string;
  total: number;
  ok: number;
  not_found: number;
  errors: number;
  error_m: {
    mean: number | null;
    median: number | null;
    p90: number | null;
    max: number | null;
    min: number | null;
  };
  bias: {
    mean_delta_east_m: number | null;
    mean_delta_north_m: number | null;
    mean_bearing_deg: number | null;
  };
  quality: {
    excelentes: number;
    buenos: number;
    malos: number;
  };
  worst_cases: Array<{
    case_id: string;
    name: string;
    error_m: number;
    query_text: string;
  }>;
}
