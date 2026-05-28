import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GeocoderService } from '../../../geocoding/geocoder.service';
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
  lastSearchHit = this.mapService.lastSearchHit;
  lastSearchGeocoder = this.mapService.lastSearchGeocoder;
  searchError = this.mapService.searchError;
  coordenadasCursor = this.mapService.coordenadasCursor;

  geocoderLabel(id: string | null): string {
    if (!id) return '—';
    return this.geocoderService.options.find((o) => o.id === id)?.label ?? id;
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
