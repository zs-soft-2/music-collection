import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionArtworkComponent } from '../../shared/collection-artwork';

import { NextAlbumsComponent } from './component/next-albums/next-albums.component';
import { CollectionsPageStore } from './collections-page.store';
import { COLLECTIONS_TAB_OPTIONS, CollectionsTab } from './collections.model';

/**
 * The published collections with where the collector stands on each: what a
 * collection asks for is resolved against the catalog, so the cards change
 * with it and with the shelf.
 *
 * There can be far more collections than anyone is after, so the list opens
 * on the ones the collector picked; the totals in the header stay over all of
 * them, as the points do.
 *
 * Above the list stands the answer to the question the cards cannot give:
 * which single record to buy next. Nothing pays until a collection is
 * complete, so that is rarely the record a collector would have guessed.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionsPageStore],
	selector: 'mc-collections-page',
	templateUrl: './collections-page.component.html',
	styleUrls: ['./collections-page.component.scss'],
	imports: [RouterLink, CollectionArtworkComponent, NextAlbumsComponent],
})
export class CollectionsPageComponent {
	protected readonly store = inject(CollectionsPageStore);

	protected readonly tabOptions = COLLECTIONS_TAB_OPTIONS;
	protected readonly skeletons = Array.from({ length: 6 }, (_, i) => i);

	protected onTab(tab: CollectionsTab): void {
		this.store.setTab(tab);
	}

	protected onQuery(event: Event): void {
		this.store.setQuery((event.target as HTMLInputElement).value);
	}

	protected onToggleFollow(uid: string): void {
		this.store.toggleFollow(uid);
	}
}
