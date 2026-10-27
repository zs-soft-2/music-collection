import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CoverFallbackDirective } from '../../shared/image';
import {
	ArtistTileComponent,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import { AlbumGroupComponent } from '../home/component/album-group/album-group.component';
import { ArtistGroupComponent } from '../home/component/artist-group/artist-group.component';
import { ArtistSpotlightComponent } from '../home/component/artist-spotlight/artist-spotlight.component';
import { CatalogCoverageChartComponent } from '../home/component/catalog-coverage-chart/catalog-coverage-chart.component';
import { JoinPromptComponent } from '../home/component/join-prompt/join-prompt.component';
import { HomePageStore } from '../home/home-page.store';

/**
 * The catalog's half of what used to be the home page: the counts and the
 * coverage by decade, the band of the week, what was added recently, the
 * most collected artists, the ways through the catalog by style, by decade
 * and by kind of act, and its newest albums.
 *
 * It shares the home page's store and its styles; the home page keeps what
 * there is to do (the big card, the collectors, the collections, the hunt)
 * and links here for the rest.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [HomePageStore],
	selector: 'mc-discover-page',
	templateUrl: './discover-page.component.html',
	styleUrls: ['../home/home-page.component.scss'],
	imports: [
		CoverFallbackDirective,
		...I18N_IMPORTS,
		RouterLink,
		ReleaseCardComponent,
		AlbumGroupComponent,
		ArtistGroupComponent,
		ArtistSpotlightComponent,
		ArtistTileComponent,
		CatalogCoverageChartComponent,
		JoinPromptComponent,
	],
})
export class DiscoverPageComponent {
	protected readonly store = inject(HomePageStore);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);
}
