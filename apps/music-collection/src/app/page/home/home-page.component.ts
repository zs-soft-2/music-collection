import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	ArtistTileComponent,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import { ArtistSpotlightComponent } from './component/artist-spotlight/artist-spotlight.component';
import { HomeSearchComponent } from './component/home-search/home-search.component';
import { HomePageStore } from './home-page.store';

/**
 * Home page: a quick search, an artist spotlight, the catalog at a glance, recently added
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
		HomeSearchComponent,
	],
})
export class HomePageComponent {
	protected readonly store = inject(HomePageStore);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);
}
