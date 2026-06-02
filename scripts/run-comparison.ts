import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { errorVector, mean, median, percentile } from './metrics';
import { NominatimProvider } from './providers/nominatim';
import { PhotonProvider } from './providers/photon';
import { ArcGisProvider } from './providers/arcgis';
import { SugdeProvider } from './providers/sugde';
import type {
  CasosFile,
  ComparisonRow,
  ComparisonSummary,
  GeocoderProvider,
  TestCase,
} from './types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CASOS_PATH = resolve(ROOT, 'data/casos.json');
const RESULTS_DIR = resolve(ROOT, 'results');
const DELAY_MS: Record<string, number> = {
  nominatim: 1100,
  photon: 350,
  arcgis: 500,
  sugde: 500,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(): { geocoder: string; limit: number | null } {
  const args = process.argv.slice(2);
  let geocoder = 'nominatim';
  let limit: number | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--geocoder' && args[i + 1]) {
      geocoder = args[++i]!;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = Number(args[++i]);
    }
  }

  return { geocoder, limit };
}

function getProvider(name: string): GeocoderProvider {
  switch (name) {
    case 'nominatim':
      return new NominatimProvider();
    case 'photon':
      return new PhotonProvider();
    case 'arcgis':
      return new ArcGisProvider();
    case 'sugde':                         
      return new SugdeProvider();
    default:
      throw new Error(`Geocoder desconocido: ${name}. Disponibles: nominatim, photon, arcgis`);
  }
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: ComparisonRow[]): string {
  const headers: (keyof ComparisonRow)[] = [
    'case_id',
    'name',
    'poi_type',
    'query_id',
    'query_text',
    'geocoder',
    'ref_lon',
    'ref_lat',
    'result_lon',
    'result_lat',
    'error_m',
    'bearing_deg',
    'delta_east_m',
    'delta_north_m',
    'display_name',
    'confidence',
    'status',
    'error_message',
    'elapsed_ms',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h] as string | number | null)).join(','));
  }
  return lines.join('\n');
}

function buildSummary(geocoder: string, rows: ComparisonRow[]): ComparisonSummary {
  const okRows = rows.filter((r) => r.status === 'ok' && r.error_m != null);
  const errors = okRows.map((r) => r.error_m!);
  const east = okRows.map((r) => r.delta_east_m!);
  const north = okRows.map((r) => r.delta_north_m!);
  const bearings = okRows.map((r) => r.bearing_deg!);

  const worst = [...okRows]
    .sort((a, b) => b.error_m! - a.error_m!)
    .slice(0, 10)
    .map((r) => ({
      case_id: r.case_id,
      name: r.name,
      error_m: r.error_m!,
      query_text: r.query_text,
    }));

  return {
    geocoder,
    run_at: new Date().toISOString(),
    total: rows.length,
    ok: rows.filter((r) => r.status === 'ok').length,
    not_found: rows.filter((r) => r.status === 'not_found').length,
    errors: rows.filter((r) => r.status === 'error').length,
    error_m: {
      mean: mean(errors),
      median: median(errors),
      p90: percentile(errors, 90),
      max: errors.length ? Math.max(...errors) : null,
      min: errors.length ? Math.min(...errors) : null,
    },
    bias: {
      mean_delta_east_m: mean(east),
      mean_delta_north_m: mean(north),
      mean_bearing_deg: mean(bearings),
    },
    worst_cases: worst,
  };
}

async function processCase(
  provider: GeocoderProvider,
  testCase: TestCase,
  delayMs: number,
): Promise<ComparisonRow[]> {
  const rows: ComparisonRow[] = [];

  for (const query of testCase.queries) {
    const start = Date.now();
    let row: ComparisonRow = {
      case_id: testCase.id,
      name: testCase.name,
      poi_type: testCase.type,
      query_id: query.id,
      query_text: query.text,
      geocoder: provider.name,
      ref_lon: testCase.ref_lon,
      ref_lat: testCase.ref_lat,
      result_lon: null,
      result_lat: null,
      error_m: null,
      bearing_deg: null,
      delta_east_m: null,
      delta_north_m: null,
      display_name: null,
      confidence: null,
      status: 'not_found',
      error_message: null,
      elapsed_ms: 0,
    };

    try {
      const result = await provider.geocode(query.text);
      row.elapsed_ms = Date.now() - start;

      if (!result) {
        row.status = 'not_found';
      } else {
        const metrics = errorVector(
          testCase.ref_lon,
          testCase.ref_lat,
          result.lon,
          result.lat,
        );
        row = {
          ...row,
          result_lon: result.lon,
          result_lat: result.lat,
          error_m: metrics.error_m,
          bearing_deg: metrics.bearing_deg,
          delta_east_m: metrics.delta_east_m,
          delta_north_m: metrics.delta_north_m,
          display_name: result.displayName ?? null,
          confidence: result.confidence ?? null,
          status: 'ok',
          elapsed_ms: row.elapsed_ms,
        };
      }
    } catch (err) {
      row.elapsed_ms = Date.now() - start;
      row.status = 'error';
      row.error_message = err instanceof Error ? err.message : String(err);
    }

    rows.push(row);
    await sleep(delayMs);
  }

  return rows;
}

async function main(): Promise<void> {
  const { geocoder, limit } = parseArgs();
  const provider = getProvider(geocoder);
  const delayMs = DELAY_MS[geocoder] ?? 1000;

  const casos = JSON.parse(readFileSync(CASOS_PATH, 'utf8')) as CasosFile;
  let cases = casos.cases;
  if (limit != null && limit > 0) {
    cases = cases.slice(0, limit);
    console.log(`Modo prueba: ${cases.length} de ${casos.count} casos`);
  }

  console.log(`Comparando ${cases.length} casos con ${provider.name}…`);

  const allRows: ComparisonRow[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    process.stdout.write('\r\x1b[K');
    process.stdout.write(`[${i + 1}/${cases.length}] ${c.name}`);
    const rows = await processCase(provider, c, delayMs);
    allRows.push(...rows);
  }
  console.log('');

  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(RESULTS_DIR, { recursive: true });
  const csvPath = resolve(RESULTS_DIR, `${geocoder}-${date}.csv`);
  const summaryPath = resolve(RESULTS_DIR, `${geocoder}-${date}-summary.json`);

  const summary = buildSummary(geocoder, allRows);
  writeFileSync(csvPath, rowsToCsv(allRows), 'utf8');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`CSV:     ${csvPath}`);
  console.log(`Resumen: ${summaryPath}`);
  console.log(
    `OK: ${summary.ok} | not_found: ${summary.not_found} | error: ${summary.errors}`,
  );
  if (summary.error_m.mean != null) {
    console.log(
      `Error (m): media=${summary.error_m.mean.toFixed(1)} mediana=${summary.error_m.median?.toFixed(1)} p90=${summary.error_m.p90?.toFixed(1)} max=${summary.error_m.max?.toFixed(1)}`,
    );
  }
  if (summary.bias.mean_delta_east_m != null) {
    console.log(
      `Sesgo vector medio: Δeste=${summary.bias.mean_delta_east_m.toFixed(1)}m Δnorte=${summary.bias.mean_delta_north_m?.toFixed(1)}m`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
