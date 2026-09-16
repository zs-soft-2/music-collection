import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RecordShelfComponent } from './component/record-shelf/record-shelf.component';
import { ReleaseRowComponent } from './component/release-row/release-row.component';
import {
	FORMAT_LABELS,
	FORMAT_ORDER,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import {
	CollectionGroup,
	CollectionSort,
	GROUP_OPTIONS,
	SORT_OPTIONS,
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
	imports: [ReleaseCardComponent, ReleaseRowComponent, RecordShelfComponent],
})
export class CollectionPageComponent {
	protected readonly store = inject(CollectionPageStore);

	protected readonly formatLabels = FORMAT_LABELS;
	protected readonly formatOrder = FORMAT_ORDER;
	protected readonly sortOptions = SORT_OPTIONS;
	protected readonly groupOptions = GROUP_OPTIONS;
	protected readonly viewOptions = VIEW_OPTIONS;

	protected readonly skeletons = Array.from({ length: 12 }, (_, i) => i);

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
