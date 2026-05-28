import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { fromLonLat, transformExtent } from 'ol/proj';
import { GeocoderService } from '../../../geocoding/geocoder.service';
import type { GeocoderId } from '../../../geocoding/geocoder.types';
import { MapService } from '../../map-service';

@Component({
  selector: 'app-header-component',
  imports: [],
  templateUrl: './header-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  inputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  mapService = inject(MapService);
  geocoderService = inject(GeocoderService);

  onGeocoderChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as GeocoderId;
    this.geocoderService.setSelected(value);
  }

  async buscarDireccion(): Promise<void> {
    const direccion = this.inputRef()?.nativeElement.value?.trim();
    if (!direccion) return;

    this.mapService.searchError.set(null);

    try {
      const hit = await this.geocoderService.geocode(direccion);
      if (!hit) {
        this.mapService.clearSearchMarker();
        this.mapService.lastSearchHit.set(null);
        this.mapService.lastSearchGeocoder.set(null);
        this.mapService.searchError.set('Sin resultados para esa búsqueda');
        return;
      }

      const map = this.mapService.mapRef();
      if (!map) return;

      this.mapService.lastSearchHit.set(hit);
      this.mapService.lastSearchGeocoder.set(this.geocoderService.selectedId());
      this.mapService.setSearchMarker(hit.lon, hit.lat);

      const view = map.getView();
      if (hit.extent) {
        const extent3857 = transformExtent(hit.extent, 'EPSG:4326', 'EPSG:3857');
        view.fit(extent3857, {
          padding: [40, 40, 40, 40],
          maxZoom: 17,
          duration: 1500,
        });
      } else {
        view.animate({
          center: fromLonLat([hit.lon, hit.lat]),
          zoom: 14,
          duration: 1500,
        });
      }
    } catch (err) {
      this.mapService.clearSearchMarker();
      this.mapService.lastSearchHit.set(null);
      this.mapService.searchError.set(
        err instanceof Error ? err.message : 'Error al geocodificar',
      );
      console.error(err);
    }
  }
}
