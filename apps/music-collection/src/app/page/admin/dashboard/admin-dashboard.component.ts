import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { StyleBarsComponent } from '../../../shared/music-ui';
import { AdminDashboardStore } from './admin-dashboard.store';
import { CollectionGrowthChartComponent } from './component/collection-growth-chart/collection-growth-chart.component';
import { CompletenessMetersComponent } from './component/completeness-meters/completeness-meters.component';

/**
 * Az admin kezdőoldala: entitás-számlálók, a gyűjtemény gyarapodása, a
 * katalógus adatminősége és összetétele, valamint gyors műveletek.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AdminDashboardStore],
	selector: 'mc-admin-dashboard',
	templateUrl: './admin-dashboard.component.html',
	styleUrls: ['./admin-dashboard.component.scss'],
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		CollectionGrowthChartComponent,
		CompletenessMetersComponent,
		StyleBarsComponent,
	],
})
export class AdminDashboardComponent {
	protected readonly store = inject(AdminDashboardStore);
}
