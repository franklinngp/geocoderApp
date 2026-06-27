import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { GeocoderService } from '../../../geocoding/geocoder.service';
import { GeocoderEvalModalComponent } from '../geocoder-eval-modal/geocoder-eval-modal';
import { mapConfig } from '../map-component/mapConfig';
import { MapService } from '../../map-service';

@Component({
  selector: 'app-header-component',
  imports: [GeocoderEvalModalComponent],
  templateUrl: './header-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  inputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  mapService = inject(MapService);
  geocoderService = inject(GeocoderService);
  evalModalOpen = signal(false);

  constructor() {
    effect(() => {
      const value = this.mapService.searchInputValue();
      if (value === null) return;
      const input = this.inputRef()?.nativeElement;
      if (input) input.value = value;
    });
  }

  async buscarDireccion(): Promise<void> {
    const direccion = this.inputRef()?.nativeElement.value?.trim();
    if (!direccion) return;
    await this.mapService.searchAddress(direccion);
  }

  abrirEvaluacion(): void {
    this.evalModalOpen.set(true);
  }

  cerrarEvaluacion(): void {
    this.evalModalOpen.set(false);
  }

  limpiarMapa(): void {
    this.mapService.clearSearchState();
    const input = this.inputRef()?.nativeElement;
    if (input) input.value = '';

    const map = this.mapService.mapRef();
    if (!map) return;

    map.getView().animate({
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      duration: 800,
    });
  }
}
