import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	ArtistTileComponent,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import { NextAlbumsComponent } from '../collections/component/next-albums/next-albums.component';
import { AlbumGroupComponent } from './component/album-group/album-group.component';
import { ArtistGroupComponent } from './component/artist-group/artist-group.component';
import { ArtistSpotlightComponent } from './component/artist-spotlight/artist-spotlight.component';
import { CollectionBigCardComponent } from './component/collection-big-card/collection-big-card.component';
import { CollectionTileComponent } from './component/collection-tile/collection-tile.component';
import { CollectorCardComponent } from './component/collector-card/collector-card.component';
import { CatalogCoverageChartComponent } from './component/catalog-coverage-chart/catalog-coverage-chart.component';
import { HomeSearchComponent } from './component/home-search/home-search.component';
import { JoinPromptComponent } from './component/join-prompt/join-prompt.component';
import { HomePageStore } from './home-page.store';
import { HOME_COLLECTOR_CARDS } from './home.model';
import { CoverFallbackDirective } from '../../shared/image';

/**
 * Home page. It opens on the big card — the collection of the week, which
 * can be turned to a handful of others — then on who is collecting here,
 * then on the collections themselves: what there is to do with this catalog
 * comes before how big the catalog is.
 *
 * Below that the catalog has its own half of the page: the counts and the
 * coverage by decade, the band of the week, what was added recently, the
 * most collected artists, ways through the catalog by style, by decade and
 * by kind of act, and its newest albums.
 *
 * Everything the catalog holds is shown to a guest as well; what needs a
 * collection behind it falls back to the catalog, and the sign-in prompt
 * says what an account adds.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [HomePageStore],
	selector: 'mc-home-page',
	templateUrl: './home-page.component.html',
	styleUrls: ['./home-page.component.scss'],
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
		HomeSearchComponent,
		JoinPromptComponent,
		CollectionBigCardComponent,
		CollectionTileComponent,
		CollectorCardComponent,
		NextAlbumsComponent,
	],
})
export class HomePageComponent {
	protected readonly store = inject(HomePageStore);

	/** As many as the wall shows, so the page keeps its length. */
	protected readonly collectorPlaceholders = HOME_COLLECTOR_CARDS;

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);
}
