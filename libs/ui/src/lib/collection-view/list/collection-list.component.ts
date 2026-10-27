import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	TemplateRef,
	booleanAttribute,
	computed,
	contentChild,
	contentChildren,
	input,
} from '@angular/core';
import { Paginator } from 'primeng/paginator';
import { Table } from 'primeng/table';

import { CollectionPlaceState, pageWithin } from '../collection-place';
import { orderOf, sortItems, sortedBy } from '../collection-sort';
import { CollectionViewState } from '../collection-view';
import { CollectionViewToggleComponent } from '../toggle/collection-view-toggle.component';
import { CollectionColumnDirective } from './collection-column.directive';

/** The page the paginator was turned to. */
interface PageEvent {
	first?: number;
	rows?: number;
}

/** What a collection page lists: anything that knows its own id. */
export interface CollectionListItem {
	uid: string;
}

/**
 * The collection pages of the admin: the same list in two views, a card grid
 * and a table, both paged.
 *
 * What the list shows is worked out from `place`: the columns it is sorted
 * by, the page each view stands on, and — through the page that owns the
 * boxes — what its filters are narrowed by. Change any of them and the rows
 * are worked out anew; the table and the grid only show what comes out.
 *
 * The page gives it the cards (`#card`) and the columns (`mcColumn`) as
 * templates, and hands its search boxes to the tools row by marking them
 * `tools`; anything that has to sit between the tools and the list — a
 * question waiting to be answered, say — is marked `banner`.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-list',
	templateUrl: './collection-list.component.html',
	styleUrls: ['./collection-list.component.scss'],
	imports: [
		NgTemplateOutlet,
		Paginator,
		Table,
		CollectionViewToggleComponent,
	],
})
export class CollectionListComponent<T extends CollectionListItem> {
	public readonly items = input.required<T[]>();

	/** Where the list stands: the page of each view and the sorting. */
	public readonly place = input.required<CollectionPlaceState>();

	/** Which of the two views is on, and what the toggle changes it to. */
	public readonly view = input.required<CollectionViewState>();

	public readonly emptyMessage = input.required<string>();

	/** True while the first load is still on its way. */
	public readonly loading = input(false, { transform: booleanAttribute });

	public readonly cardRowsOptions = input<number[]>([24, 48, 96]);

	public readonly tableRowsOptions = input<number[]>([10, 25, 50]);

	/** The class a row is given, to fade the withdrawn ones and the like. */
	public readonly rowClass = input<(item: T) => string>(() => '');

	public readonly card = contentChild.required<TemplateRef<unknown>>('card');

	public readonly columns = contentChildren(CollectionColumnDirective);

	/** The whole list in the order the columns ask for. */
	public readonly sorted = computed(() =>
		sortItems(this.items(), this.place().sort())
	);

	/** The page of the cards, kept within the list as it stands now. */
	public readonly cardsFirst = computed(() =>
		pageWithin(
			this.place().cards.first(),
			this.place().cards.rows(),
			this.items().length
		)
	);

	/** The page of the table, kept within the list as it stands now. */
	public readonly tableFirst = computed(() =>
		pageWithin(
			this.place().table.first(),
			this.place().table.rows(),
			this.items().length
		)
	);

	public readonly cardPage = computed(() =>
		this.sorted().slice(
			this.cardsFirst(),
			this.cardsFirst() + this.place().cards.rows()
		)
	);

	public readonly tablePage = computed(() =>
		this.sorted().slice(
			this.tableFirst(),
			this.tableFirst() + this.place().table.rows()
		)
	);

	/** Which way a column sorts the list: 1 up, -1 down, 0 not at all. */
	public orderOf(field: string): number {
		return orderOf(this.place().sort(), field);
	}

	/** Which level a column is, once more than one of them sorts the list. */
	public levelOf(field: string): number | null {
		const sort = this.place().sort();
		const index = sort.findIndex((level) => level.field === field);

		return sort.length > 1 && index >= 0 ? index + 1 : null;
	}

	/** The page the cards were turned to. */
	public pagedCards(page: PageEvent): void {
		this.place().cards.setPage(
			page.first ?? 0,
			page.rows ?? this.place().cards.rows()
		);
	}

	/** The page the table was turned to. */
	public pagedTable(page: PageEvent): void {
		this.place().table.setPage(
			page.first ?? 0,
			page.rows ?? this.place().table.rows()
		);
	}

	/**
	 * Sorts the list by the column. Held down, the shift key adds it as a
	 * further level instead, to break the ties of the column before it.
	 * A list sorted anew is read from its top.
	 */
	public sortBy(field: string, event: Event): void {
		const added = (event as MouseEvent | KeyboardEvent).shiftKey === true;

		this.place().setSort(sortedBy(this.place().sort(), field, added));
		this.place().table.setPage(0, this.place().table.rows());
	}
}
