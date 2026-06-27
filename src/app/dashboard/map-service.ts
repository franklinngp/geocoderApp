import { Injectable, inject, signal } from '@angular/core';
import type { EventsKey } from 'ol/events';
import { boundingExtent, buffer, createEmpty, extendCoordinate } from 'ol/extent';
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
import {
  drawFeatureStyle,
  formatMeasurementLabel,
  randomDrawColor,
  type MeasurementResult,
} from './draw-styles';
import { DIRECCIONES } from '../data/direcciones';
import { GeocoderService } from '../geocoding/geocoder.service';
import type { GeocodeHit, GeocoderCompareResult, GeocoderId } from '../geocoding/geocoder.types';

export type DrawMode = 'none' | 'LineString' | 'Polygon';

export type { MeasurementResult } from './draw-styles';

export interface DrawMeasurementItem extends MeasurementResult {
  id: string;
  color: string;
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
  selectedGeocoderResultId = signal<GeocoderId | null>(null);

  drawMode = signal<DrawMode>('none');
  drawMeasurements = signal<DrawMeasurementItem[]>([]);

  private drawSource = signal<VectorSource | null>(null);
  private drawInteraction: Draw | null = null;
  private geometryChangeKey: EventsKey | null = null;
  private measurementCounter = 0;

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
    this.drawMeasurements.set([]);
  }

  exitDrawMode(): void {
    this.drawMode.set('none');
    this.syncDrawInteraction();
    this.resetMapCursor();
  }

  private resetMapCursor(): void {
    const map = this.mapRef();
    if (!map) return;
    const viewport = map.getViewport();
    viewport.style.cursor = '';
    viewport.classList.remove('ol-draw');
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

    this.drawInteraction = new Draw({
      source,
      type: mode,
      style: drawFeatureStyle,
    });

    this.drawInteraction.on('drawstart', (evt) => {
      const feature = evt.feature;
      feature.set('color', randomDrawColor());
      feature.set('drawType', mode === 'LineString' ? 'line' : 'polygon');
      const geom = feature.getGeometry();
      if (geom) this.bindGeometryChange(feature, geom, mode);
    });

    this.drawInteraction.on('drawend', (evt) => {
      const feature = evt.feature;
      const geom = feature.getGeometry();
      if (geom) {
        const measurement = this.computeMeasurement(geom, mode);
        if (measurement) {
          const id = `draw-${++this.measurementCounter}`;
          feature.set('measurementId', id);
          feature.set('label', formatMeasurementLabel(measurement));
          feature.changed();
          this.drawMeasurements.update((list) => [
            ...list,
            { ...measurement, id, color: feature.get('color') as string },
          ]);
        }
      }
      this.unbindGeometryChange();
    });

    map.addInteraction(this.drawInteraction);
  }

  private bindGeometryChange(
    feature: Feature,
    geom: Geometry,
    mode: DrawMode,
  ): void {
    this.unbindGeometryChange();
    const updateLabel = (): void => {
      const measurement = this.computeMeasurement(geom, mode);
      if (!measurement) return;
      feature.set('label', formatMeasurementLabel(measurement));
      feature.changed();
    };
    this.geometryChangeKey = geom.on('change', updateLabel);
    updateLabel();
  }

  private unbindGeometryChange(): void {
    if (this.geometryChangeKey) {
      unByKey(this.geometryChangeKey);
      this.geometryChangeKey = null;
    }
  }

  private computeMeasurement(
    geom: Geometry,
    mode: DrawMode,
  ): MeasurementResult | null {
    const proj = { projection: 'EPSG:3857' as const };

    if (mode === 'LineString' && geom instanceof LineString) {
      if (geom.getCoordinates().length < 2) return null;
      return {
        type: 'line',
        lengthM: getLength(geom, proj),
      };
    }

    if (mode === 'Polygon' && geom instanceof Polygon) {
      const ring = geom.getLinearRing(0);
      if (!ring || ring.getCoordinates().length < 4) return null;
      const perimeterM = getLength(new LineString(ring.getCoordinates()), proj);
      return {
        type: 'polygon',
        lengthM: perimeterM,
        areaM2: getArea(geom, proj),
      };
    }

    return null;
  }

  setSearchMarkers(results: GeocoderCompareResult[]): void {
    const source = this.searchSource();
    if (!source) return;

    source.clear();
    for (const result of results) {
      if (!result.hit) continue;
      source.addFeature(
        new Feature({
          geometry: new Point(fromLonLat([result.hit.lon, result.hit.lat])),
          geocoderId: result.geocoderId,
          displayName: result.hit.displayName,
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
    this.selectedGeocoderResultId.set(null);
  }

  fitToGeocoderResult(result: GeocoderCompareResult): void {
    if (!result.hit) return;
    this.selectedGeocoderResultId.set(result.geocoderId);
    this.fitToHits([result.hit]);
  }

  private fitToHits(hits: GeocodeHit[]): void {
    const map = this.mapRef();
    if (!map || hits.length === 0) return;

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
        padding: [80, 80, 80, 80],
        maxZoom: 17,
        duration: 800,
      });
      return;
    }

    if (hits.length === 1) {
      const center = fromLonLat([hits[0].lon, hits[0].lat]);
      const extent = createEmpty();
      extendCoordinate(extent, center);
      view.fit(buffer(extent, 350), {
        padding: [80, 80, 80, 80],
        maxZoom: 17,
        duration: 800,
      });
      return;
    }

    const coords3857 = hits.map((h) => fromLonLat([h.lon, h.lat]));
    view.fit(buffer(boundingExtent(coords3857), 120), {
      padding: [80, 80, 80, 80],
      maxZoom: 17,
      duration: 800,
    });
  }

  async searchAddress(
    direccion: string,
    csvRef?: { lat: number; lon: number; id?: number },
  ): Promise<void> {
    const trimmed = direccion.trim();
    if (!trimmed) return;

    this.searchError.set(null);
    this.searchInputValue.set(trimmed);
    this.selectedGeocoderResultId.set(null);

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

    this.setSearchMarkers(results);
    this.fitToHits(hits);
  }
}
