import { map } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionArtworkComponent } from '../../shared/collection-artwork';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';
import { PlayerStore } from '../../shared/player';

import { CollectionDetailPageStore } from './collection-detail-page.store';
import { ALBUM_FILTER_OPTIONS, AlbumFilter } from './collections.model';

/**
 * One collection: what it asks for, and which of those records are already on
 * the shelf. Both are resolved live, so the page answers "where do I stand
 * right now" rather than replaying a stored membership.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionDetailPageStore],
	selector: 'mc-collection-detail-page',
	templateUrl: './collection-detail-page.component.html',
	styleUrls: ['./collection-detail-page.component.scss'],
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		CollectionArtworkComponent,
		PageBreadcrumbComponent,
	],
})
export class CollectionDetailPageComponent {
	protected readonly store = inject(CollectionDetailPageStore);
	protected readonly player = inject(PlayerStore);

	protected readonly filterOptions = ALBUM_FILTER_OPTIONS;
	protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

	public constructor() {
		this.store.load(
			inject(ActivatedRoute).paramMap.pipe(
				map((params) => params.get('slug') ?? '')
			)
		);
	}

	protected onFilter(filter: AlbumFilter): void {
		this.store.setFilter(filter);
	}

	protected onToggleFollow(): void {
		this.store.toggleFollowed();
	}

	/** Puts the collection on the radio, its records one after another. */
	protected onPlay(slug: string, name: string): void {
		this.player
			.startStation({ kind: 'collection', slug }, name)
			.catch((error) =>
				console.error('The collection did not come on', error)
			);
	}
}
