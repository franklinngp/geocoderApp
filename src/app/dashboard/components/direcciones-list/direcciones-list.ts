import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIRECCIONES, type DireccionItem } from '../../../data/direcciones';
import { GeocoderService } from '../../../geocoding/geocoder.service';
import { MapService } from '../../map-service';

@Component({
  selector: 'app-direcciones-list',
  imports: [],
  templateUrl: './direcciones-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-h-0' },
})
export class DireccionesListComponent {
  readonly direcciones = DIRECCIONES;

  mapService = inject(MapService);
  geocoderService = inject(GeocoderService);

  selectedId = this.mapService.selectedDireccionId;

  async onSelect(item: DireccionItem): Promise<void> {
    if (this.geocoderService.searching()) return;

    await this.mapService.searchAddress(item.name, {
      lat: item.lat,
      lon: item.lon,
      id: item.id,
    });
  }
}
