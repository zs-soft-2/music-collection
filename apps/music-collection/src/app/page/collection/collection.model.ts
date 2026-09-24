import { MediaFormat, ReleaseView } from '../../shared/music-ui';

/** Filter, sort, group and view models of the collection page. */

export type CollectionView = 'grid' | 'list' | 'shelf';

export type CollectionSort =
	'artist' | 'title' | 'year-desc' | 'year-asc' | 'added';

export type CollectionGroup = 'none' | 'artist' | 'format' | 'style' | 'decade';

export type FormatFilter = MediaFormat | 'all';

export interface ReleaseGroup {
	key: string;
	label: string;
	items: ReleaseView[];
}

/** The drawn compartment a record stands in, without the position. */
export interface ShelfSpotRef {
	unitId: string;
	row: number;
	column: number;
}

/**
 * A compartment as the shelf draws it: the records in it, and — in a drawn
 * unit — which compartment of the furniture it is, so a record dropped on it
 * knows where it landed.
 */
export interface ShelfCompartmentView extends ReleaseGroup {
	spot: ShelfSpotRef | null;
}

/**
 * A record dropped on the shelf: which compartment it landed in, and how far
 * along that compartment it was let go.
 */
export interface ShelfDrop extends ShelfSpotRef {
	releaseId: string;
	/** Where among the records the compartment shows, 0-based. */
	index: number;
}

/**
 * A part of the shelving put on the player: the records standing there, in
 * the order they stand, and what to call the run of them.
 */
export interface ShelfPlay {
	label: string;
	/** Album ids, the way the compartment reads left to right. */
	albumIds: string[];
}

/**
 * A drawn shelving unit with the compartments filed into it. A unit with no
 * columns is the open wall the shelf falls back to when nothing is drawn.
 */
export interface ShelfUnitView {
	key: string;
	name: string;
	columns: number;
	/**
	 * The compartments in grid order, top left to bottom right — every drawn
	 * one, including those with nothing in them, so a record filed by hand
	 * into the bottom row is drawn in the bottom row.
	 */
	compartments: ShelfCompartmentView[];
	/** Records with no drawn compartment left to hold them. */
	overflow: boolean;
}

/** A group split into render chunks, so hundreds of cards never build in one tick. */
export interface ChunkedReleaseGroup {
	key: string;
	label: string;
	count: number;
	chunks: ReleaseView[][];
}

export interface CollectionStats {
	total: number;
	artists: number;
	byFormat: Record<MediaFormat, number>;
}

export const SORT_OPTIONS: { value: CollectionSort; labelKey: string }[] = [
	{ value: 'artist', labelKey: 'page.collection.sortBy.artist' },
	{ value: 'title', labelKey: 'page.collection.sortBy.title' },
	{ value: 'year-desc', labelKey: 'page.collection.sortBy.newest' },
	{ value: 'year-asc', labelKey: 'page.collection.sortBy.oldest' },
	{ value: 'added', labelKey: 'page.collection.sortBy.added' },
];

export const GROUP_OPTIONS: { value: CollectionGroup; labelKey: string }[] = [
	{ value: 'none', labelKey: 'page.collection.groupBy.none' },
	{ value: 'artist', labelKey: 'page.collection.groupBy.artist' },
	{ value: 'format', labelKey: 'page.collection.groupBy.format' },
	{ value: 'style', labelKey: 'page.collection.groupBy.style' },
	{ value: 'decade', labelKey: 'page.collection.groupBy.decade' },
];

export const VIEW_OPTIONS: {
	value: CollectionView;
	labelKey: string;
	icon: string;
}[] = [
	{
		value: 'grid',
		labelKey: 'page.collection.viewAs.grid',
		icon: 'pi pi-th-large',
	},
	{
		value: 'list',
		labelKey: 'page.collection.viewAs.list',
		icon: 'pi pi-list',
	},
	{
		value: 'shelf',
		labelKey: 'page.collection.viewAs.shelf',
		icon: 'pi pi-book',
	},
];
