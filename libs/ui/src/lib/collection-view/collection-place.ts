import { Signal, computed, signal } from '@angular/core';

import { CollectionSortLevel } from './collection-sort';

/** The page one of the two views stands on. */
export interface CollectionPageState {
	readonly first: Signal<number>;
	readonly rows: Signal<number>;
	setPage(first: number, rows: number): void;
}

/** Where a collection page stood when it was left. */
export interface CollectionPlaceState {
	readonly cards: CollectionPageState;
	readonly table: CollectionPageState;
	/** The columns the list is sorted by, in the order they were clicked. */
	readonly sort: Signal<CollectionSortLevel[]>;
	setSort(sort: CollectionSortLevel[]): void;
	/** What the named filter was last narrowed by, empty while it is off. */
	filterOf(name: string): string;
	setFilter(name: string, value: string): void;
}

interface StoredPage {
	first: number;
	rows: number;
}

interface StoredPlace {
	cards: StoredPage;
	filters: Record<string, string>;
	sort: CollectionSortLevel[];
	table: StoredPage;
}

/**
 * The place a collection page is at — the page each of its two views stands
 * on, how the table is sorted, and what its filters are narrowed by — kept
 * for as long as the tab is open, so that opening an entity and coming back
 * lands where the list was left.
 *
 * Without storage the list simply starts from the top: a convenience only.
 */
export function createCollectionPlace(
	storageKey: string,
	rows: { cards?: number; table?: number } = {}
): CollectionPlaceState {
	const pageKey = `${storageKey}.page`;
	const place = signal<StoredPlace>(
		read(pageKey, rows.cards ?? 24, rows.table ?? 10)
	);
	const save = (next: StoredPlace) => {
		place.set(next);

		try {
			sessionStorage.setItem(pageKey, JSON.stringify(next));
		} catch {
			// The place is a convenience only.
		}
	};
	const pageOf = (view: 'cards' | 'table'): CollectionPageState => ({
		first: computed(() => place()[view].first),
		rows: computed(() => place()[view].rows),
		setPage: (first: number, rows: number) =>
			save({ ...place(), [view]: { first, rows } }),
	});

	return {
		cards: pageOf('cards'),
		table: pageOf('table'),
		sort: computed(() => place().sort),
		setSort: (sort: CollectionSortLevel[]) => save({ ...place(), sort }),
		filterOf: (name: string) => place().filters[name] ?? '',
		setFilter: (name: string, value: string) =>
			save({
				...place(),
				// A narrower list is another list: both views start at its top.
				cards: { ...place().cards, first: 0 },
				filters: { ...place().filters, [name]: value },
				table: { ...place().table, first: 0 },
			}),
	};
}

/**
 * The first row of the page the list can actually show: a page remembered
 * from a longer list would show nothing at all, so it gives the last page
 * instead. While nothing is loaded yet the page is left as it is, to be
 * taken up again once the entities arrive.
 */
export function pageWithin(first: number, rows: number, count: number): number {
	if (count === 0 || rows <= 0 || first < count) {
		return Math.max(0, first);
	}

	return Math.floor((count - 1) / rows) * rows;
}

function read(
	pageKey: string,
	cardRows: number,
	tableRows: number
): StoredPlace {
	const top: StoredPlace = {
		cards: { first: 0, rows: cardRows },
		filters: {},
		sort: [],
		table: { first: 0, rows: tableRows },
	};

	try {
		const stored = sessionStorage.getItem(pageKey);

		if (!stored) {
			return top;
		}

		const parsed = JSON.parse(stored) as Partial<StoredPlace>;

		return {
			cards: page(parsed.cards, cardRows),
			filters: parsed.filters ?? {},
			sort: Array.isArray(parsed.sort) ? parsed.sort : [],
			table: page(parsed.table, tableRows),
		};
	} catch {
		return top;
	}
}

function page(
	stored: Partial<StoredPage> | undefined,
	rows: number
): StoredPage {
	return {
		first: typeof stored?.first === 'number' ? stored.first : 0,
		rows: typeof stored?.rows === 'number' ? stored.rows : rows,
	};
}
