import * as XLSX from 'xlsx';
import type { DireccionItem } from '../data/direcciones';
import { mean } from './metrics';

export interface EvalExportRow {
  point: DireccionItem;
  geocoderId: string;
  geocoderLabel: string;
  resultado: string;
  huboResultado: boolean;
  euclideanM: number | null;
  haversineM: number | null;
  averageM: number | null;
  elapsedMs: number;
  resultLat: number | null;
  resultLon: number | null;
}

const DETAIL_HEADERS = [
  'ID',
  'Punto',
  'Ref. Lat',
  'Ref. Lon',
  'Geocoder',
  'Resultado',
  'Hubo resultado',
  'Dist. euclidiana (m)',
  'Dist. Haversine (m)',
  'Promedio (m)',
  'Calidad',
  'Tiempo respuesta (ms)',
  'Result. Lat',
  'Result. Lon',
] as const;

const SUMMARY_HEADERS = [
  'Geocoder',
  'OK',
  'Fallos',
  'Excelentes (<5m)',
  'Buenos (5-30m)',
  'Malos (≥30m)',
  'Euclidiana media (m)',
  'Haversine media (m)',
  'Promedio medio (m)',
  'Tiempo respuesta medio (ms)',
] as const;

function round(value: number | null, digits = 2): number | '' {
  if (value == null) return '';
  return Number(value.toFixed(digits));
}

function qualityLabel(m: number | null): string {
  if (m == null) return '';
  if (m < 5) return 'Excelente';
  if (m < 30) return 'Bueno';
  return 'Malo';
}

function detailRowToArray(row: EvalExportRow): (string | number)[] {
  return [
    row.point.id,
    row.point.name,
    row.point.lat,
    row.point.lon,
    row.geocoderLabel,
    row.resultado,
    row.huboResultado ? 'Sí' : 'No',
    round(row.euclideanM),
    round(row.haversineM),
    round(row.averageM),
    qualityLabel(row.averageM),
    row.elapsedMs,
    row.resultLat ?? '',
    row.resultLon ?? '',
  ];
}

function buildSummaryRows(rows: EvalExportRow[]): (string | number)[][] {
  const byGeocoder = new Map<string, EvalExportRow[]>();
  for (const row of rows) {
    const list = byGeocoder.get(row.geocoderLabel) ?? [];
    list.push(row);
    byGeocoder.set(row.geocoderLabel, list);
  }

  return [...byGeocoder.entries()].map(([label, geocoderRows]) => {
    const ok = geocoderRows.filter((r) => r.huboResultado);
    return [
      label,
      ok.length,
      geocoderRows.length - ok.length,
      ok.filter((r) => r.averageM != null && r.averageM < 5).length,
      ok.filter((r) => r.averageM != null && r.averageM >= 5 && r.averageM < 30).length,
      ok.filter((r) => r.averageM != null && r.averageM >= 30).length,
      round(mean(ok.map((r) => r.euclideanM!))),
      round(mean(ok.map((r) => r.haversineM!))),
      round(mean(ok.map((r) => r.averageM!))),
      round(mean(geocoderRows.map((r) => r.elapsedMs)), 0),
    ];
  });
}

export function downloadEvalXlsx(
  rows: EvalExportRow[],
  filename = 'evaluacion-geocoders.xlsx',
): void {
  const detailData = [
    [...DETAIL_HEADERS],
    ...rows.map(detailRowToArray),
  ];

  const summaryData = [
    [...SUMMARY_HEADERS],
    ...buildSummaryRows(rows),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(detailData),
    'Detalle',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryData),
    'Resumen',
  );

  XLSX.writeFile(workbook, filename);
}
