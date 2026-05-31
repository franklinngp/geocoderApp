import { Injectable, inject, signal } from '@angular/core';
import type { EventsKey } from 'ol/events';
import { boundingExtent } from 'ol/extent';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import { unByKey } from 'ol/Observable';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Draw from 'ol/interaction/Draw';
import { fromLonLat, transformExtent } from 'ol/proj';
import { getArea, getLength } from 'ol/sphere';
import VectorSource from 'ol/source/Vector';
import { DIRECCIONES } from '../data/direcciones';
import { GeocoderService } from '../geocoding/geocoder.service';
import type { GeocodeHit, GeocoderCompareResult } from '../geocoding/geocoder.types';

export type DrawMode = 'none' | 'LineString' | 'Polygon';

export interface MeasurementResult {
  type: 'line' | 'polygon';
  lengthM: number;
  areaM2?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private geocoderService = inject(GeocoderService);

  mapRef = signal<Map | null>(null);
  searchSource = signal<VectorSource | null>(null);
  searchCompareResults = signal<GeocoderCompareResult[]>([]);
  searchError = signal<string | null>(null);
  coordenadasCursor = signal<{ lon: number; lat: number } | null>(null);
  selectedDireccionId = signal<number | null>(null);
  /** Coordenadas de referencia del CSV para calcular error del geocoder */
  searchReferenceCsv = signal<{ lat: number; lon: number } | null>(null);
  /** Sincroniza el input del header cuando se elige desde la lista */
  searchInputValue = signal<string | null>(null);

  drawMode = signal<DrawMode>('none');
  measurement = signal<MeasurementResult | null>(null);

  private drawSource = signal<VectorSource | null>(null);
  private drawInteraction: Draw | null = null;
  private geometryChangeKey: EventsKey | null = null;

  registerDrawSource(source: VectorSource): void {
    this.drawSource.set(source);
  }

  setDrawMode(mode: DrawMode): void {
    const next =
      this.drawMode() === mode && mode !== 'none' ? 'none' : mode;
    this.drawMode.set(next);
    this.syncDrawInteraction();
  }

  clearDrawings(): void {
    this.drawSource()?.clear();
    this.measurement.set(null);
  }

  private syncDrawInteraction(): void {
    const map = this.mapRef();
    if (!map) return;

    if (this.drawInteraction) {
      map.removeInteraction(this.drawInteraction);
      this.drawInteraction = null;
    }
    this.unbindGeometryChange();

    const mode = this.drawMode();
    const source = this.drawSource();
    if (mode === 'none' || !source) return;

    this.drawInteraction = new Draw({ source, type: mode });

    this.drawInteraction.on('drawstart', (evt) => {
      source.clear();
      this.measurement.set(null);
      const geom = evt.feature.getGeometry();
      if (geom) this.bindGeometryChange(geom, mode);
    });

    this.drawInteraction.on('drawend', (evt) => {
      const geom = evt.feature.getGeometry();
      if (geom) this.updateMeasurement(geom, mode);
      this.unbindGeometryChange();
    });

    map.addInteraction(this.drawInteraction);
  }

  private bindGeometryChange(geom: Geometry, mode: DrawMode): void {
    this.unbindGeometryChange();
    this.geometryChangeKey = geom.on('change', () =>
      this.updateMeasurement(geom, mode),
    );
  }

  private unbindGeometryChange(): void {
    if (this.geometryChangeKey) {
      unByKey(this.geometryChangeKey);
      this.geometryChangeKey = null;
    }
  }

  private updateMeasurement(geom: Geometry, mode: DrawMode): void {
    const proj = { projection: 'EPSG:3857' as const };

    if (mode === 'LineString' && geom instanceof LineString) {
      this.measurement.set({
        type: 'line',
        lengthM: getLength(geom, proj),
      });
      return;
    }

    if (mode === 'Polygon' && geom instanceof Polygon) {
      const ring = geom.getLinearRing(0);
      const perimeterM = ring
        ? getLength(new LineString(ring.getCoordinates()), proj)
        : 0;
      this.measurement.set({
        type: 'polygon',
        lengthM: perimeterM,
        areaM2: getArea(geom, proj),
      });
    }
  }

  setSearchMarkers(hits: GeocodeHit[]): void {
    const source = this.searchSource();
    if (!source) return;

    source.clear();
    for (const hit of hits) {
      source.addFeature(
        new Feature({
          geometry: new Point(fromLonLat([hit.lon, hit.lat])),
        }),
      );
    }
  }

  clearSearchMarker(): void {
    this.searchSource()?.clear();
  }

  clearSearchState(): void {
    this.clearSearchMarker();
    this.searchCompareResults.set([]);
    this.searchError.set(null);
    this.selectedDireccionId.set(null);
    this.searchReferenceCsv.set(null);
    this.searchInputValue.set(null);
  }

  async searchAddress(
    direccion: string,
    csvRef?: { lat: number; lon: number; id?: number },
  ): Promise<void> {
    const trimmed = direccion.trim();
    if (!trimmed) return;

    this.searchError.set(null);
    this.searchInputValue.set(trimmed);

    if (csvRef) {
      this.searchReferenceCsv.set({ lat: csvRef.lat, lon: csvRef.lon });
      this.selectedDireccionId.set(csvRef.id ?? null);
    } else {
      const item = DIRECCIONES.find(
        (d) => d.name.toLowerCase() === trimmed.toLowerCase(),
      );
      this.searchReferenceCsv.set(
        item ? { lat: item.lat, lon: item.lon } : null,
      );
      this.selectedDireccionId.set(item?.id ?? null);
    }

    const results = await this.geocoderService.geocodeAll(trimmed);
    this.searchCompareResults.set(results);

    const hits = results.flatMap((r) => (r.hit ? [r.hit] : []));
    if (hits.length === 0) {
      this.clearSearchMarker();
      this.searchError.set('Sin resultados en ningún geocoder');
      return;
    }

    const map = this.mapRef();
    if (!map) return;

    this.setSearchMarkers(hits);

    const view = map.getView();
    const extents4326 = hits
      .map((h) => h.extent)
      .filter((e): e is [number, number, number, number] => e != null);

    if (extents4326.length > 0) {
      const combined: [number, number, number, number] = [
        Math.min(...extents4326.map((e) => e[0])),
        Math.min(...extents4326.map((e) => e[1])),
        Math.max(...extents4326.map((e) => e[2])),
        Math.max(...extents4326.map((e) => e[3])),
      ];
      const extent3857 = transformExtent(combined, 'EPSG:4326', 'EPSG:3857');
      view.fit(extent3857, {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
        duration: 1500,
      });
    } else {
      const coords3857 = hits.map((h) => fromLonLat([h.lon, h.lat]));
      view.fit(boundingExtent(coords3857), {
        padding: [60, 60, 60, 60],
        maxZoom: 17,
        duration: 1500,
      });
    }
  }
}
