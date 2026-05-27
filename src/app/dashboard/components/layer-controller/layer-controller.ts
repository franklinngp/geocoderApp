import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapService } from '../../map-service';

@Component({
  selector: 'app-layer-controller',
  imports: [],
  templateUrl: './layer-controller.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerController { 

  mapService = inject(MapService);
  datosBusquedaNominatim = this.mapService.datosBusquedaNominatim;
  coordenadasCursor = this.mapService.coordenadasCursor;

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

  onChangeLayerNominatim() {
    const layer = this.mapService.mapRef()?.getLayers().getArray().find((layer) => layer.get('name') === 'nominatim');
    if (layer) {
      layer.setVisible(!layer.getVisible());
    }
  }
  
}
