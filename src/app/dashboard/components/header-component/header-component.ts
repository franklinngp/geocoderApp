import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { fromLonLat, transformExtent } from 'ol/proj';
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

  buscarDireccion() {
    const direccion = this.inputRef()?.nativeElement.value?.trim();
    if (!direccion) return;

    const urlNomitamin = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1&countrycodes=uy`;
    fetch(urlNomitamin)
      .then((response) => response.json())
      .then((data) => {
        if (!data?.length) {
          this.mapService.clearSearchMarker();
          return;
        }

        const map = this.mapService.mapRef();
        if (!map) return;

        const result = data[0];
        this.mapService.datosBusquedaNominatim.set(data);
        console.log(this.mapService.datosBusquedaNominatim());
        const lon = Number(result.lon);
        const lat = Number(result.lat);
        const view = map.getView();

        this.mapService.setSearchMarker(lon, lat);

        if (result.boundingbox?.length === 4) {
          const [south, north, west, east] = result.boundingbox.map(Number);
          const extent = transformExtent(
            [west, south, east, north],
            'EPSG:4326',
            'EPSG:3857',
          );
          view.fit(extent, {
            padding: [40, 40, 40, 40],
            maxZoom: 17,
            duration: 1500,
          });
        } else {
          view.animate({
            center: fromLonLat([lon, lat]),
            zoom: 14,
            duration: 1500,
          });
        }
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }
 }
