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

/** How many entries the home page shows of the wall. */
export const WALL_HOME_COUNT = 6;
