import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WorldMapComponent } from '../../shared/world-map';

import { MapPageStore } from './map-page.store';

/**
 * The collectors on a world map. A pin stands for a country, because a
 * country is all anyone is asked for; what shows under it — a city, a name,
 * a face — is whatever each collector chose to share.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MapPageStore],
	selector: 'mc-map-page',
	templateUrl: './map-page.component.html',
	styleUrls: ['./map-page.component.scss'],
	imports: [RouterLink, WorldMapComponent],
})
export class MapPageComponent {
	protected readonly store = inject(MapPageStore);
}
