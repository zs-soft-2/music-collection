/**
 * The wall of finished collections.
 *
 * Not a list of collectors — a list of what collectors have finished, under
 * the face of whoever finished it. A collection nobody has completed is
 * nowhere here; the collections page is where those live, with what they ask
 * for. This page answers the other question: who got there, and with what.
 */

/** One finished collection, as the wall shows it. */
export interface WallBadge {
	slug: string;
	name: string;
	imageUrl: string | null;
	points: number;
}

/** One collector, with what they have finished. */
export interface WallEntry {
	uid: string;
	displayName: string | null;
	photoURL: string | null;
	/** Stands in for a missing picture. */
	initial: string;
	place: string | null;
	copies: number;
	points: number;
	badges: WallBadge[];
	/** Epoch ms of the entry; what "recent" sorts by. */
	updatedAt: number;
}

/** A collection somebody on the wall has finished, and how many did. */
export interface WallCollection {
	slug: string;
	name: string;
	imageUrl: string | null;
	collectors: number;
}

/**
 * One finished collection under the face of whoever finished it — what the
 * home page shows a few of, and the shortest answer to "what is this app
 * for" that a visitor can be given.
 */
export interface WallHighlight {
	uid: string;
	displayName: string | null;
	photoURL: string | null;
	initial: string;
	badge: WallBadge;
}

/** A face on a collection's card: who finished it. */
export interface WallFinisher {
	uid: string;
	displayName: string | null;
	photoURL: string | null;
	initial: string;
}

/**
 * A published collection, and who has finished it.
 *
 * The definitions come from the catalog, which only the server writes, so
 * nothing here needs the border post the collector-written entries do. The
 * faces on it do: they come from the directory.
 */
export interface WallCollectionCard {
	slug: string;
	name: string;
	description: string | null;
	/** PrimeIcons class, where the collection carries one. */
	icon: string | null;
	imageUrl: string | null;
	/** Discographies stand apart: there is a pair of them per band. */
	group: string | null;
	finishers: WallFinisher[];
	finisherCount: number;
}

/** Which way round the page is read: by collection, or by collector. */
export type WallView = 'collections' | 'collectors';

export type WallSort = 'recent' | 'badges' | 'points' | 'shelf' | 'name';

export const WALL_SORTS: { value: WallSort; labelKey: string }[] = [
	{ value: 'recent', labelKey: 'page.collectors.sort.recent' },
	{ value: 'badges', labelKey: 'page.collectors.sort.badges' },
	{ value: 'points', labelKey: 'page.collectors.sort.points' },
	{ value: 'shelf', labelKey: 'page.collectors.sort.shelf' },
	{ value: 'name', labelKey: 'page.collectors.sort.name' },
];

/** How many collections the filter row offers before it stops. */
export const WALL_FILTER_LIMIT = 16;

/** How many faces a collection's card carries before it only counts them. */
export const WALL_FACES = 5;

/** How many entries the home page shows of the wall. */
export const WALL_HOME_COUNT = 6;
