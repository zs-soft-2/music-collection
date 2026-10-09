import { ShelfCubby, ShelfSide } from '@music-collection/api';

import { MediaFormat, ReleaseView } from '../../shared/music-ui';

/** Filter, sort, group and view models of the collection page. */

export type CollectionView = 'grid' | 'list' | 'shelf';

export type CollectionSort =
	'artist' | 'title' | 'year-desc' | 'year-asc' | 'added' | 'stars';

/**
 * Which records the shelf shows, by what the collector thinks of them: all
 * of them, the ones they love, or the ones they have never said a word about.
 *
 * The last is the useful one. A collection outgrows anybody's memory, and
 * "what have I never had an opinion about" is the question that puts a record
 * back on the turntable.
 */
export type StarFilter = 'all' | 'loved' | 'unrated';

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
 *
 * `items` reads the way the compartment does, left to right, whichever wall
 * each record leans against; `rightFrom` is where the run standing against
 * the right wall begins in it. Everything that only wants to know what is in
 * the compartment — the play button, the search, the heading — can go on
 * reading `items` and never hear about the two walls at all.
 */
export interface ShelfCompartmentView extends ReleaseGroup {
	spot: ShelfSpotRef | null;
	/**
	 * Where in `items` the right-hand run starts; `items.length` where
	 * nothing stands against the right wall, which is most compartments.
	 */
	rightFrom: number;
}

/**
 * Where on the shelf a record actually stands. Not a place it was given —
 * the shelf works one out for every record it draws, filed by hand or not —
 * but the one it is drawn in right now, which is what a collector walking up
 * to the furniture needs to be told.
 */
export interface ShelfPlace {
	/** The unit it stands in; empty on the open wall and off the shelf. */
	unitName: string;
	/** Which compartment of a drawn unit; null on the wall and off it. */
	spot: ShelfSpotRef | null;
	/** Nothing drawn was left to hold it, or tall enough for it. */
	offShelf: boolean;
	/** What the compartment is called, for where there is no spot to name. */
	compartment: string;
	/** The compartment's key: what the shelf is walked over to. */
	cell: string;
}

/** A record the search found, and where it stands. */
export interface ShelfMatchView extends ShelfPlace {
	/** The copy, which is what a spine on the shelf is. */
	id: string;
	artistName: string;
	title: string;
}

/** A found record as the list above the shelf names it. */
export interface ShelfMatchListing extends ShelfMatchView {
	/** Where it stands, in the reader's own words. */
	where: string;
}

/**
 * Records put down on the shelf: which compartment they landed in, and how
 * far along that compartment they were let go.
 *
 * An armful rather than a record, because a collector rearranging a shelf
 * moves a run of them at a time — the ones they picked out travel together
 * and are put down side by side, in the order they stood in.
 */
export interface ShelfDrop extends ShelfSpotRef {
	/** What was carried, in the order it is to stand; never empty. */
	releaseIds: string[];
	/** Which wall of that compartment it was let go against. */
	side: ShelfSide;
	/** Where among the records standing against that wall, 0-based. */
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
	/** How big one of its compartments is, so the drawing can be to scale. */
	cubby: ShelfCubby;
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
	{ value: 'stars', labelKey: 'page.collection.sortBy.stars' },
];

export const STAR_OPTIONS: { value: StarFilter; labelKey: string }[] = [
	{ value: 'all', labelKey: 'page.collection.stars.all' },
	{ value: 'loved', labelKey: 'page.collection.stars.loved' },
	{ value: 'unrated', labelKey: 'page.collection.stars.unrated' },
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
