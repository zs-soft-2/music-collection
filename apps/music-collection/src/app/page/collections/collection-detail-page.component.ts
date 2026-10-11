import { map } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionBackdropComponent } from '../../shared/collection-backdrop';
import { CollectionEmblemComponent } from '../../shared/collection-emblem';
import { CollectionPinComponent } from '../../shared/collection-pin';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';
import { PlayerStore } from '../../shared/player';

import { CollectionAlbumComponent } from './component/collection-album/collection-album.component';
import { CollectionBadgeComponent } from './component/collection-badge/collection-badge.component';
import { CollectionCrowdComponent } from './component/collection-crowd/collection-crowd.component';
import { CollectionDecadesComponent } from './component/collection-decades/collection-decades.component';
import { CollectionRuleComponent } from './component/collection-rule/collection-rule.component';
import { CollectionStatsComponent } from './component/collection-stats/collection-stats.component';
import { NextAlbumsComponent } from './component/next-albums/next-albums.component';
import { CollectionDetailPageStore } from './collection-detail-page.store';
import {
	ALBUM_FILTER_OPTIONS,
	ALBUM_SORT_OPTIONS,
	AlbumFilter,
	AlbumSort,
} from './collections.model';

/** How many faces the header carries; the panel names them all. */
const HERO_FACES = 5;

/**
 * One collection: what it asks for, which of those records are already on
 * the shelf, and who else is on it. Everything is resolved live, so the page
 * answers "where do I stand right now" rather than replaying a stored
 * membership.
 *
 * It opens on the same mark the cards carry — the artwork behind, the
 * records in the emblem, the pin in the ring — so arriving from a card is
 * arriving at the thing that was clicked. Under that header the page splits:
 * what to do with the collection on the left, what the collection is on the
 * right.
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
		CollectionAlbumComponent,
		CollectionBackdropComponent,
		CollectionBadgeComponent,
		CollectionCrowdComponent,
		CollectionDecadesComponent,
		CollectionEmblemComponent,
		CollectionPinComponent,
		CollectionRuleComponent,
		CollectionStatsComponent,
		NextAlbumsComponent,
		PageBreadcrumbComponent,
	],
})
export class CollectionDetailPageComponent {
	protected readonly store = inject(CollectionDetailPageStore);
	protected readonly player = inject(PlayerStore);

	protected readonly filterOptions = ALBUM_FILTER_OPTIONS;
	protected readonly sortOptions = ALBUM_SORT_OPTIONS;
	protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

	/** Whoever finished it first, then whoever is after it. */
	protected readonly heroFaces = computed(() => {
		const crowd = this.store.crowd();

		return [...crowd.finishers, ...crowd.hunters].slice(0, HERO_FACES);
	});

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

	protected onSort(sort: AlbumSort): void {
		this.store.setSort(sort);
	}

	protected onToggleFollow(): void {
		this.store.toggleFollowed();
	}

	/** Puts this collection on the collector's public page, or takes it off. */
	protected onToggleShown(): void {
		this.store.toggleShownCollection();
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
