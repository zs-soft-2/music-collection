import { NgTemplateOutlet } from '@angular/common';
import {
	afterRenderEffect,
	ChangeDetectionStrategy,
	Component,
	inject,
	untracked,
	viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { RecordShelfComponent } from './component/record-shelf/record-shelf.component';
import { ReleaseRowComponent } from './component/release-row/release-row.component';
import {
	CopyPlacementComponent,
	CopyRemovalComponent,
	DecadeChartComponent,
	FORMAT_ORDER,
	ReleaseCardComponent,
	StyleBarsComponent,
} from '../../shared/music-ui';
import { CollectionProgressComponent } from '../collections/component/collection-progress/collection-progress.component';
import { focusOnClose } from '../../shared/dialog-focus';
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
		...I18N_IMPORTS,
		NgTemplateOutlet,
		ReleaseCardComponent,
		ReleaseRowComponent,
		RecordShelfComponent,
		CopyPlacementComponent,
		CopyRemovalComponent,
		DecadeChartComponent,
		StyleBarsComponent,
		CollectionProgressComponent,
		RouterLink,
	],
})
export class CollectionPageComponent {
	protected readonly store = inject(CollectionPageStore);
	protected readonly player = inject(PlayerStore);

	protected readonly formatOrder = FORMAT_ORDER;
	protected readonly sortOptions = SORT_OPTIONS;
	protected readonly groupOptions = GROUP_OPTIONS;
	protected readonly viewOptions = VIEW_OPTIONS;

	/** The shelf, where the search walks over to what it found. */
	private readonly shelf = viewChild(RecordShelfComponent);

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

	/**
	 * Turns the shelf to one of the records the search found. Asked for
	 * outright rather than left to the effect below, because picking the
	 * record the shelf is already turned to changes nothing to react to —
	 * and walking back over to it is exactly why you would click it twice.
	 */
	protected onFindMatch(copyId: string): void {
		this.store.pickMatch(copyId);
		this.shelf()?.reveal(copyId);
	}

	public constructor() {
		/*
		 * The search points the shelf at what it found, without waiting to
		 * be clicked: type a title and the shelf walks over to the record.
		 * After the render, because a compartment has to be drawn before it
		 * can be scrolled to.
		 */
		afterRenderEffect(() => {
			const match = this.store.focusedMatch();
			const shelf = this.shelf();

			if (match && shelf) {
				untracked(() => shelf.reveal(match.id));
			}
		});

		/* The home page quick search links here with `?q=`. */
		const query = inject(ActivatedRoute).snapshot.queryParamMap.get('q');
		if (query) {
			this.store.setQuery(query);
		}

		// Back from a dialog: focus the icon on the card or the row it was
		// opened from. A record let go of takes its own icon with it, and the
		// shelf is redrawn without it — there is nothing left to go back to.
		focusOnClose(this.store.removingCopyId, (copyId) => [
			`[data-remove-copy="${copyId}"]`,
		]);
		focusOnClose(this.store.placingCopyId, (copyId) => [
			`[data-place-copy="${copyId}"]`,
		]);
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
