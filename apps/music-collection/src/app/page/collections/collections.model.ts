import {
	MusicCollectionGroup,
	MusicCollectionMembership,
	ScoreHighlight,
} from '@music-collection/domain/music-collection/api';

/**
 * How many covers a card carries for the mosaic that stands in for a
 * collection without artwork of its own.
 *
 * More than the four the mosaic shows, because it can be set to turn them
 * over: a tile changing to a cover already standing beside it would read as
 * the picture glitching rather than moving on. Sixteen is a set a collector
 * will not see repeat while the card is on the screen, and it is only the
 * urls — a cover itself is fetched when a tile asks for it.
 */
export const COVER_POOL_SIZE = 16;

/**
 * How many records the hunt list shows. A collector with eight hundred gaps
 * is not helped by a list of eight hundred; the point of ranking them is to
 * name the few that are worth a trip to the shop.
 */
export const NEXT_ALBUM_COUNT = 6;

/** One collection and where the collector stands on it, as a card shows it. */
export interface CollectionCardView {
	uid: string;
	slug: string;
	name: string;
	description: string | null;
	/** PrimeIcons class; null falls back to the cover mosaic. */
	icon: string | null;
	coverImageUrl: string | null;
	/** Name of the badge the collection rewards; null when it has none. */
	badgeName: string | null;
	/** Picture of that badge — the cast pin first; null while there is none. */
	badgeArtworkUrl: string | null;
	owned: number;
	total: number;
	missing: number;
	/** 0–100. */
	percentage: number;
	completed: boolean;
	/** What finishing it is worth, the collector's pressings included. */
	points: number;
	/** What they hold right now: 0 until the collection is complete. */
	earnedPoints: number;
	/** How much of `points` the collector's own pressings added. */
	bonusPoints: number;
	/** Covers of the first albums, for a collection without artwork. */
	covers: string[];
	/**
	 * Which shelf of the list it stands on; null is the curated list. There
	 * is a pair of discographies for every band the catalog knows, so they
	 * stand apart rather than burying the handful of curated collections.
	 */
	group: MusicCollectionGroup | null;
}

/** A card as the list renders it: the collector's pick decides the star. */
export interface CollectionCardListView extends CollectionCardView {
	followed: boolean;
	/** Whether others are told the collector is after this one. */
	shown: boolean;
}

/** One shelf of the list, as the page renders it under a heading. */
export interface CollectionGroupView {
	group: MusicCollectionGroup | null;
	labelKey: string;
	/** What this shelf is, in one line. */
	leadKey: string;
	collections: CollectionCardListView[];
}

/** One collection asking for a record, as the hunt list names it. */
export interface NextAlbumDemandView {
	name: string;
	slug: string;
	/** How many records it still misses, this one counted. */
	missing: number;
}

/**
 * One record worth buying next. `unlockedPoints` is what the collector holds
 * the moment it is on the shelf — a badge, and a score that stops being zero
 * — and is 0 for a record that finishes nothing yet; `potentialPoints` is how
 * much of the still-locked score it moves.
 */
export interface NextAlbumView {
	albumUid: string;
	albumName: string;
	artistName: string;
	year: number | null;
	coverUrl: string | null;
	unlockedPoints: number;
	/** The collections this one record would complete, by name. */
	completes: string[];
	potentialPoints: number;
	/** Every collection that wants it, the nearest to finishing first. */
	wantedBy: NextAlbumDemandView[];
}

/** One album of the collection, with whether it is on the shelf. */
export interface CollectionAlbumView extends MusicCollectionMembership {
	owned: boolean;
}

/** The badge, once there is a page with room to describe it. */
export interface CollectionBadgeView {
	name: string;
	description: string | null;
	icon: string | null;
	artworkUrl: string | null;
	/** Earned right now — the collection is complete. */
	earned: boolean;
}

export interface CollectionDetailView extends CollectionCardView {
	badge: CollectionBadgeView | null;
	albums: CollectionAlbumView[];
	/** Which records raised the score, and why. */
	highlights: ScoreHighlight[];
}

/** Which albums the detail page lists. */
export type AlbumFilter = 'all' | 'missing' | 'owned';

export const ALBUM_FILTER_OPTIONS: { value: AlbumFilter; labelKey: string }[] =
	[
		{ value: 'all', labelKey: 'page.collections.filter.all' },
		{ value: 'owned', labelKey: 'page.collections.filter.owned' },
		{ value: 'missing', labelKey: 'page.collections.filter.missing' },
	];

/** Which collections the list shows. */
export type CollectionsTab = 'following' | 'all';

export const COLLECTIONS_TAB_OPTIONS: {
	value: CollectionsTab;
	labelKey: string;
}[] = [
	{ value: 'following', labelKey: 'page.collections.filter.following' },
	{ value: 'all', labelKey: 'page.collections.filter.all' },
];
