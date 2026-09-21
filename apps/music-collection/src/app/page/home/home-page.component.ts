import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	ArtistTileComponent,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import { CollectionProgressComponent } from '../collections/component/collection-progress/collection-progress.component';
import { ArtistSpotlightComponent } from './component/artist-spotlight/artist-spotlight.component';
import { CatalogCoverageChartComponent } from './component/catalog-coverage-chart/catalog-coverage-chart.component';
import { HomeSearchComponent } from './component/home-search/home-search.component';
import { HomePageStore } from './home-page.store';

/**
 * Home page: a quick search, an artist spotlight, the catalog at a glance
 * (counts and collection coverage by decade), recently added
 * releases, the most collected artists and the newest albums of the catalog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [HomePageStore],
	selector: 'mc-home-page',
	templateUrl: './home-page.component.html',
	styleUrls: ['./home-page.component.scss'],
	imports: [
		DecimalPipe,
		RouterLink,
		ReleaseCardComponent,
		ArtistSpotlightComponent,
		ArtistTileComponent,
		CatalogCoverageChartComponent,
		HomeSearchComponent,
		CollectionProgressComponent,
	],
})
export class HomePageComponent {
	protected readonly store = inject(HomePageStore);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);
}
