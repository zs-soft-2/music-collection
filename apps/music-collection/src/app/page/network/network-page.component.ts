import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NetworkDetailsComponent } from './component/network-details/network-details.component';
import { NetworkGraphComponent } from './component/network-graph/network-graph.component';
import { NetworkSearchComponent } from './component/network-search/network-search.component';
import {
	MAX_DEPTH,
	MIN_DEPTH,
	NetworkFilterFlag,
	NetworkPageStore,
} from './network-page.store';

/**
 * Relationship network: musicians, bands, projects and albums on a pannable,
 * zoomable graph around a chosen focus, with the selected node's details.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [NetworkPageStore],
	selector: 'mc-network-page',
	templateUrl: './network-page.component.html',
	styleUrls: ['./network-page.component.scss'],
	imports: [
		NetworkGraphComponent,
		NetworkDetailsComponent,
		NetworkSearchComponent,
	],
})
export class NetworkPageComponent {
	protected readonly store = inject(NetworkPageStore);

	protected readonly depths = Array.from(
		{ length: MAX_DEPTH - MIN_DEPTH + 1 },
		(_, i) => MIN_DEPTH + i
	);

	protected onDepthChange(event: Event): void {
		this.store.setDepth(Number((event.target as HTMLSelectElement).value));
	}

	protected onFlagChange(flag: NetworkFilterFlag, event: Event): void {
		this.store.setFlag(flag, (event.target as HTMLInputElement).checked);
	}
}
