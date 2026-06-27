import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { CasosFile, TestCase } from './types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEOJSON_PATH = resolve(ROOT, '../turismo_filtrado.geojson');
const OUTPUT_PATH = resolve(ROOT, 'data/casos.json');

interface GeoJsonFeature {
  type: 'Feature';
  id?: string;
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    country?: string;
    type?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface GeoJsonCollection {
  features: GeoJsonFeature[];
}

function buildFullQuery(street: string, housenumber: string, city: string): string {
  return `${street} ${housenumber}, ${city}, Uruguay`;
}

function main(): void {
  const raw = readFileSync(GEOJSON_PATH, 'utf8');
  const geojson = JSON.parse(raw) as GeoJsonCollection;

  const cases: TestCase[] = [];

  for (const feature of geojson.features) {
    const p = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const street = p.street?.trim();
    const housenumber = p.housenumber?.trim();
    const city = p.city?.trim() ?? 'Montevideo';
    const name = p.name?.trim();

    if (!street || !housenumber || !name) {
      console.warn(`Omitido (datos incompletos): ${feature.id ?? name ?? 'sin id'}`);
      continue;
    }

    cases.push({
      id: feature.id ?? `${name}-${lon}-${lat}`,
      name,
      ref_lon: lon,
      ref_lat: lat,
      street,
      housenumber,
      city,
      country: p.country ?? 'UY',
      type: p.type ?? 'unknown',
      queries: [
        {
          id: 'full',
          label: 'Dirección completa',
          text: buildFullQuery(street, housenumber, city),
        },
      ],
    });
  }

  const output: CasosFile = {
    generated_at: new Date().toISOString(),
    source: GEOJSON_PATH,
    count: cases.length,
    cases,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Generados ${cases.length} casos → ${OUTPUT_PATH}`);
}

main();
