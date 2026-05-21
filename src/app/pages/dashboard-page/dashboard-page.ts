import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent } from '../../dashboard/components/map-component/map-component';

@Component({
  selector: 'app-dashboard-page',
  imports: [MapComponent],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full min-h-0' },
})
export class DashboardPage { }
