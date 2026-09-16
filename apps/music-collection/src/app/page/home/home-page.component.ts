import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReleaseCardComponent } from '../../shared/music-ui';
import { ArtistSpotlightComponent } from './component/artist-spotlight/artist-spotlight.component';
import { ArtistTileComponent } from './component/artist-tile/artist-tile.component';
import { DecadeChartComponent } from './component/decade-chart/decade-chart.component';
import { StyleBarsComponent } from './component/style-bars/style-bars.component';
import { HomePageStore } from './home-page.store';

/**
 * Home page: an artist spotlight, the collection at a glance, recently added
 * releases, the most collected artists and the newest albums of the catalog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [HomePageStore],
	selector: 'mc-home-page',
	templateUrl: './home-page.component.html',
	styleUrls: ['./home-page.component.scss'],
	imports: [
		RouterLink,
		ReleaseCardComponent,
		ArtistSpotlightComponent,
		ArtistTileComponent,
		DecadeChartComponent,
		StyleBarsComponent,
	],
})
export class HomePageComponent {
	protected readonly store = inject(HomePageStore);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);
}
