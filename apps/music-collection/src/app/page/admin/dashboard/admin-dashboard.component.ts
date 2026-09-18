import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminDashboardStore } from './admin-dashboard.store';

/** Az admin kezdőoldala: entitás-számlálók és gyors műveletek. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AdminDashboardStore],
	selector: 'mc-admin-dashboard',
	templateUrl: './admin-dashboard.component.html',
	styleUrls: ['./admin-dashboard.component.scss'],
	imports: [RouterLink],
})
export class AdminDashboardComponent {
	protected readonly store = inject(AdminDashboardStore);
}
