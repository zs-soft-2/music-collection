import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { NextAlbumsComponent } from '../collections/component/next-albums/next-albums.component';
import { CollectionBigCardComponent } from './component/collection-big-card/collection-big-card.component';
import { CollectionTileComponent } from './component/collection-tile/collection-tile.component';
import { CollectorCardComponent } from './component/collector-card/collector-card.component';
import { HomeSearchComponent } from './component/home-search/home-search.component';
import { HomePageStore } from './home-page.store';
import { HOME_COLLECTOR_CARDS } from './home.model';

/**
 * Home page. It opens on the big card — the collection of the week, which
 * can be turned to a handful of others — then on who is collecting here,
 * then on the collections themselves: what there is to do with this catalog
 * comes before how big the catalog is.
 *
 * The catalog's own half — counts, the band of the week, ways through
 * it by style, decade and act — lives on the discover page, linked from
 * the foot of this one.
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
		HomeSearchComponent,
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
