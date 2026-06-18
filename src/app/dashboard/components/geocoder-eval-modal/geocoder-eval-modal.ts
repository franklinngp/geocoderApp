import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DIRECCIONES, type DireccionItem } from '../../../data/direcciones';
import {
  downloadEvalXlsx,
  type EvalExportRow,
} from '../../../geocoding/export-eval-xlsx';
import { geocoderColor } from '../../../geocoding/geocoder-colors';
import { GeocoderService } from '../../../geocoding/geocoder.service';
import type { GeocoderCompareResult, GeocoderId } from '../../../geocoding/geocoder.types';
import { distanceMetrics, mean } from '../../../geocoding/metrics';

export interface GeocoderEvalRow {
  geocoderId: GeocoderId;
  label: string;
  resultado: string;
  huboResultado: boolean;
  euclideanM: number | null;
  haversineM: number | null;
  averageM: number | null;
  elapsedMs: number;
  status: 'ok' | 'not_found' | 'error';
  message: string | null;
}

export interface PointEvalResult {
  point: DireccionItem;
  rows: GeocoderEvalRow[];
}

export interface GeocoderSummaryRow {
  geocoderId: GeocoderId;
  label: string;
  ok: number;
  failed: number;
  excelentes: number;
  buenos: number;
  malos: number;
  meanEuclideanM: number | null;
  meanHaversineM: number | null;
  meanAverageM: number | null;
  meanElapsedMs: number | null;
}

export interface BatchDetailRow extends GeocoderEvalRow {
  point: DireccionItem;
}

type EvalMode = 'single' | 'batch';

@Component({
  selector: 'app-geocoder-eval-modal',
  imports: [],
  templateUrl: './geocoder-eval-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeocoderEvalModalComponent {
  open = input.required<boolean>();

  closed = output<void>();

  readonly direcciones = DIRECCIONES;
  geocoderService = inject(GeocoderService);

  selectedId = signal(DIRECCIONES[0]!.id);
  evaluating = signal(false);
  evalMode = signal<EvalMode | null>(null);
  rows = signal<GeocoderEvalRow[]>([]);
  evaluatedPoint = signal<DireccionItem | null>(null);
  batchResults = signal<PointEvalResult[]>([]);
  summaryRows = signal<GeocoderSummaryRow[]>([]);
  detailRows = signal<BatchDetailRow[]>([]);
  exportRows = signal<EvalExportRow[]>([]);
  evalError = signal<string | null>(null);

  geocoderColor(id: GeocoderId): string {
    return geocoderColor(id);
  }

  geocoderLabel(id: GeocoderId): string {
    return this.geocoderService.options.find((o) => o.id === id)?.label ?? id;
  }

  loadingProgress = this.geocoderService.geocodingProgress;

  onPointChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.selectedId.set(value);
  }

  close(): void {
    if (this.evaluating()) return;
    this.closed.emit();
  }

  private resetResults(): void {
    this.evalError.set(null);
    this.rows.set([]);
    this.evaluatedPoint.set(null);
    this.batchResults.set([]);
    this.summaryRows.set([]);
    this.detailRows.set([]);
    this.exportRows.set([]);
  }

  private buildRows(
    point: DireccionItem,
    results: GeocoderCompareResult[],
  ): GeocoderEvalRow[] {
    return results.map((r) => {
      const label =
        this.geocoderService.options.find((o) => o.id === r.geocoderId)
          ?.label ?? r.geocoderId;

      if (r.error || !r.hit) {
        return {
          geocoderId: r.geocoderId,
          label,
          resultado: r.error ?? 'Sin resultados',
          huboResultado: false,
          euclideanM: null,
          haversineM: null,
          averageM: null,
          elapsedMs: r.elapsedMs,
          status: r.error ? 'error' : 'not_found',
          message: r.error ?? 'Sin resultados',
        };
      }

      const metrics = distanceMetrics(
        point.lon,
        point.lat,
        r.hit.lon,
        r.hit.lat,
      );

      return {
        geocoderId: r.geocoderId,
        label,
        resultado: r.hit.displayName,
        huboResultado: true,
        euclideanM: metrics.euclideanM,
        haversineM: metrics.haversineM,
        averageM: metrics.averageM,
        elapsedMs: r.elapsedMs,
        status: 'ok',
        message: null,
      };
    });
  }

  private buildExportRowsFromResults(
    allResults: PointEvalResult[],
    rawResults?: Map<number, GeocoderCompareResult[]>,
  ): EvalExportRow[] {
    return allResults.flatMap((pr) =>
      pr.rows.map((row) => {
        const raw = rawResults
          ?.get(pr.point.id)
          ?.find((r) => r.geocoderId === row.geocoderId);
        return {
          point: pr.point,
          geocoderId: row.geocoderId,
          geocoderLabel: row.label,
          resultado: row.resultado,
          huboResultado: row.huboResultado,
          euclideanM: row.euclideanM,
          haversineM: row.haversineM,
          averageM: row.averageM,
          elapsedMs: row.elapsedMs,
          resultLat: raw?.hit?.lat ?? null,
          resultLon: raw?.hit?.lon ?? null,
        };
      }),
    );
  }

  private buildSummary(allResults: PointEvalResult[]): GeocoderSummaryRow[] {
    return this.geocoderService.options.map(({ id, label }) => {
      const okRows = allResults.flatMap((pr) =>
        pr.rows.filter((r) => r.geocoderId === id && r.status === 'ok'),
      );
      const allRows = allResults.flatMap((pr) =>
        pr.rows.filter((r) => r.geocoderId === id),
      );
      const failed = allResults.length - okRows.length;

      return {
        geocoderId: id,
        label,
        ok: okRows.length,
        failed,
        excelentes: okRows.filter((r) => r.averageM! < 5).length,
        buenos: okRows.filter((r) => r.averageM! >= 5 && r.averageM! < 30).length,
        malos: okRows.filter((r) => r.averageM! >= 30).length,
        meanEuclideanM: mean(okRows.map((r) => r.euclideanM!)),
        meanHaversineM: mean(okRows.map((r) => r.haversineM!)),
        meanAverageM: mean(okRows.map((r) => r.averageM!)),
        meanElapsedMs: mean(allRows.map((r) => r.elapsedMs)),
      };
    });
  }

  private buildDetailRows(allResults: PointEvalResult[]): BatchDetailRow[] {
    return allResults.flatMap((pr) =>
      pr.rows.map((row) => ({ ...row, point: pr.point })),
    );
  }

  private exportXlsx(rows: EvalExportRow[], suffix: string): void {
    const date = new Date().toISOString().slice(0, 10);
    downloadEvalXlsx(rows, `evaluacion-geocoders-${suffix}-${date}.xlsx`);
  }

  downloadXlsx(): void {
    const rows = this.exportRows();
    if (rows.length === 0) return;
    const suffix =
      this.evalMode() === 'batch'
        ? `todos-${this.direcciones.length}`
        : `punto-${this.evaluatedPoint()?.id ?? 'single'}`;
    this.exportXlsx(rows, suffix);
  }

  async evaluate(): Promise<void> {
    const point = this.direcciones.find((d) => d.id === this.selectedId());
    if (!point || this.evaluating()) return;

    this.evaluating.set(true);
    this.evalMode.set('single');
    this.resetResults();

    try {
      const results = await this.geocoderService.geocodeAll(point.name);
      const evalRows = this.buildRows(point, results);
      const exportData = this.buildExportRowsFromResults(
        [{ point, rows: evalRows }],
        new Map([[point.id, results]]),
      );

      this.rows.set(evalRows);
      this.evaluatedPoint.set(point);
      this.exportRows.set(exportData);
      this.exportXlsx(exportData, `punto-${point.id}`);
    } catch (err) {
      this.evalError.set(
        err instanceof Error ? err.message : 'Error al evaluar geocoders',
      );
    } finally {
      this.evaluating.set(false);
    }
  }

  async evaluateAll(): Promise<void> {
    if (this.evaluating()) return;

    this.evaluating.set(true);
    this.evalMode.set('batch');
    this.resetResults();

    try {
      const allResults: PointEvalResult[] = [];
      const rawByPoint = new Map<number, GeocoderCompareResult[]>();
      this.geocoderService.searching.set(true);

      for (let i = 0; i < this.direcciones.length; i++) {
        const point = this.direcciones[i]!;
        const results = await this.geocoderService.geocodeAll(point.name, {
          batch: {
            index: i + 1,
            total: this.direcciones.length,
            name: point.name,
          },
          manageSearching: false,
        });
        rawByPoint.set(point.id, results);
        allResults.push({
          point,
          rows: this.buildRows(point, results),
        });
      }

      const exportData = this.buildExportRowsFromResults(allResults, rawByPoint);

      this.batchResults.set(allResults);
      this.summaryRows.set(this.buildSummary(allResults));
      this.detailRows.set(this.buildDetailRows(allResults));
      this.exportRows.set(exportData);
      this.exportXlsx(exportData, `todos-${this.direcciones.length}`);
    } catch (err) {
      this.evalError.set(
        err instanceof Error ? err.message : 'Error al evaluar geocoders',
      );
    } finally {
      this.geocoderService.searching.set(false);
      this.evaluating.set(false);
    }
  }

  formatDistance(value: number | null): string {
    if (value == null) return '—';
    if (value < 1000) return `${value.toFixed(2)} m`;
    return `${(value / 1000).toFixed(2)} km`;
  }

  formatMs(value: number | null): string {
    if (value == null) return '—';
    return `${Math.round(value)} ms`;
  }

  quality(m: number | null): { label: string; cls: string } {
    if (m == null) return { label: '—', cls: '' };
    if (m < 5) return { label: 'Excelente', cls: 'text-success' };
    if (m < 30) return { label: 'Bueno', cls: 'text-warning' };
    return { label: 'Malo', cls: 'text-error' };
  }
}
