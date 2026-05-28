import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DireccionesListComponent } from '../../dashboard/components/direcciones-list/direcciones-list';
import { MapComponent } from '../../dashboard/components/map-component/map-component';

@Component({
  selector: 'app-dashboard-page',
  imports: [DireccionesListComponent, MapComponent],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full min-h-0' },
})
export class DashboardPage { }
