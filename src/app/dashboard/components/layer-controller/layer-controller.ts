import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { getDistance } from 'ol/sphere';
import { GeocoderService } from '../../../geocoding/geocoder.service';
import type { GeocoderCompareResult } from '../../../geocoding/geocoder.types';
import { MapService } from '../../map-service';

@Component({
  selector: 'app-layer-controller',
  imports: [],
  templateUrl: './layer-controller.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerController {
  mapService = inject(MapService);
  geocoderService = inject(GeocoderService);
  searchError = this.mapService.searchError;
  coordenadasCursor = this.mapService.coordenadasCursor;

  searchReferenceCsv = this.mapService.searchReferenceCsv;
  drawMode = this.mapService.drawMode;
  measurement = this.mapService.measurement;

  /** Error en metros: resultado del geocoder vs coordenadas CSV */
  searchResultsWithDistance = computed((): GeocoderCompareResult[] => {
    const ref = this.mapService.searchReferenceCsv();
    const results = this.mapService.searchCompareResults();
    if (!ref) return results;

    return results.map((r) => {
      if (!r.hit) return r;
      return {
        ...r,
        distanceM: getDistance(
          [ref.lon, ref.lat],
          [r.hit.lon, r.hit.lat],
        ),
      };
    });
  });

  geocoderLabel(id: string | null): string {
    if (!id) return '—';
    return this.geocoderService.options.find((o) => o.id === id)?.label ?? id;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  }

  formatArea(m2: number): string {
    if (m2 < 10000) return `${Math.round(m2)} m²`;
    return `${(m2 / 10000).toFixed(2)} ha`;
  }

  toggleDrawLine(): void {
    this.mapService.setDrawMode('LineString');
  }

  toggleDrawPolygon(): void {
    this.mapService.setDrawMode('Polygon');
  }

  clearDrawing(): void {
    this.mapService.clearDrawings();
  }

  verificar_visibilidad() {
    return this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'layer_ide')?.getVisible();
  }
  onChangeLayer() {
    const layer = this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'layer_osm');
    if (layer) {
      console.log('layer_osm', layer.getVisible());
      layer.setVisible(!layer.getVisible());
    }
    const layerIde = this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'layer_ide');
    if (layerIde) {
      console.log('layerIde', layerIde.getVisible());
      layerIde.setVisible(!layerIde.getVisible());
    }
  }
  onChangeLayerAeropuertos() {
    const layer = this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'capaAeropuerto');
    if (layer) {
  
      layer.setVisible(!layer.getVisible());
    }
  }
  onChangeLayerAreasPobladas() {
    const layer = this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'areasUrbanas');
    if (layer) {

      layer.setVisible(!layer.getVisible());
    }
  }
  onChangeLayerDepartamentos() {
    const layer = this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'layer_departamentos');
    if (layer) {
      layer.setVisible(!layer.getVisible());
    }
  }
  
}
