import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	ArtistTileComponent,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import { CollectionProgressComponent } from '../collections/component/collection-progress/collection-progress.component';
import { NextAlbumsComponent } from '../collections/component/next-albums/next-albums.component';
import { AlbumGroupComponent } from './component/album-group/album-group.component';
import { ArtistGroupComponent } from './component/artist-group/artist-group.component';
import { ArtistSpotlightComponent } from './component/artist-spotlight/artist-spotlight.component';
import { CatalogCoverageChartComponent } from './component/catalog-coverage-chart/catalog-coverage-chart.component';
import { HomeSearchComponent } from './component/home-search/home-search.component';
import { JoinPromptComponent } from './component/join-prompt/join-prompt.component';
import { HomePageStore } from './home-page.store';

/**
 * Home page: a quick search, an artist spotlight, the catalog at a glance
 * (counts and collection coverage by decade), recently added releases, the
 * most collected artists, then ways through the catalog itself — by style,
 * by decade and by kind of act — and the newest albums of the catalog.
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
		CollectionProgressComponent,
		NextAlbumsComponent,
	],
})
export class HomePageComponent {
	protected readonly store = inject(HomePageStore);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);
}
