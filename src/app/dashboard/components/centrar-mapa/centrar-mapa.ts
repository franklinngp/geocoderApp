import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapService } from '../../map-service';
import { mapConfig } from '../map-component/mapConfig';

@Component({
  selector: 'app-centrar-mapa',
  imports: [],
  templateUrl: './centrar-mapa.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CentrarMapaComponent {
  mapService = inject(MapService);

  centrarMapa() {
    //this.mapService.mapRef()?.getView().setCenter(mapConfig.center);
    //this.mapService.mapRef()?.getView().setZoom(mapConfig.zoom);

    this.mapService.mapRef()?.getView().animate({
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      duration: 1500,
    });
  } 
  centrarMontevideo(){
    //this.mapService.mapRef()?.getView().setCenter([-56.1649676, -34.9138756]);
    //this.mapService.mapRef()?.getView().setZoom(14);

    this.mapService.mapRef()?.getView().animate({
      center: [-6251960.79, -4151657.55],
      zoom: 14,
      duration: 1500,
    });
  }
 }
