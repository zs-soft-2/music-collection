import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RecordShelfComponent } from './component/record-shelf/record-shelf.component';
import { ReleaseRowComponent } from './component/release-row/release-row.component';
import {
	CopyPlacementComponent,
	DecadeChartComponent,
	FORMAT_LABELS,
	FORMAT_ORDER,
	ReleaseCardComponent,
	StyleBarsComponent,
} from '../../shared/music-ui';
import { CollectionProgressComponent } from '../collections/component/collection-progress/collection-progress.component';
import { PlayerStore } from '../../shared/player';
import {
	CollectionGroup,
	CollectionSort,
	GROUP_OPTIONS,
	SORT_OPTIONS,
	ShelfPlay,
	VIEW_OPTIONS,
} from './collection.model';
import { CollectionPageStore } from './collection-page.store';

/**
 * Collection page: media-aware release cards, a dense list and a record shelf
 * over the same filter / sort / group state.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionPageStore],
	selector: 'mc-collection-page',
	templateUrl: './collection-page.component.html',
	styleUrls: ['./collection-page.component.scss'],
	imports: [
		NgTemplateOutlet,
		ReleaseCardComponent,
		ReleaseRowComponent,
		RecordShelfComponent,
		CopyPlacementComponent,
		DecadeChartComponent,
		StyleBarsComponent,
		CollectionProgressComponent,
		RouterLink,
	],
})
export class CollectionPageComponent {
	protected readonly store = inject(CollectionPageStore);
	protected readonly player = inject(PlayerStore);

	protected readonly formatLabels = FORMAT_LABELS;
	protected readonly formatOrder = FORMAT_ORDER;
	protected readonly sortOptions = SORT_OPTIONS;
	protected readonly groupOptions = GROUP_OPTIONS;
	protected readonly viewOptions = VIEW_OPTIONS;

	protected readonly skeletons = Array.from({ length: 12 }, (_, i) => i);
	protected readonly collectionSkeletons = Array.from(
		{ length: 3 },
		(_, i) => i
	);

	/** Puts a compartment — or a whole unit — on, record after record. */
	protected onPlayShelf(shelf: ShelfPlay): void {
		this.player
			.playQueue(shelf.albumIds, shelf.label)
			.catch((error) =>
				console.error('The shelf did not come on', error)
			);
	}

	public constructor() {
		/* The home page quick search links here with `?q=`. */
		const query = inject(ActivatedRoute).snapshot.queryParamMap.get('q');
		if (query) {
			this.store.setQuery(query);
		}
	}

	protected onQuery(event: Event): void {
		this.store.setQuery((event.target as HTMLInputElement).value);
	}

	protected onSort(event: Event): void {
		this.store.setSort(
			(event.target as HTMLSelectElement).value as CollectionSort
		);
	}

	protected onGroup(event: Event): void {
		this.store.setGroup(
			(event.target as HTMLSelectElement).value as CollectionGroup
		);
	}
}
