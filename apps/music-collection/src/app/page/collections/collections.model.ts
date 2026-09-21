import {
	MusicCollectionMembership,
	ScoreHighlight,
} from '@music-collection/domain/music-collection/api';

/** Covers shown on a collection card that has no artwork of its own. */
export const COVER_MOSAIC_SIZE = 4;

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
}

/** A card as the list renders it: the collector's pick decides the star. */
export interface CollectionCardListView extends CollectionCardView {
	followed: boolean;
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

export const ALBUM_FILTER_OPTIONS: { value: AlbumFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'owned', label: 'Owned' },
	{ value: 'missing', label: 'Missing' },
];

/** Which collections the list shows. */
export type CollectionsTab = 'following' | 'all';

export const COLLECTIONS_TAB_OPTIONS: {
	value: CollectionsTab;
	label: string;
}[] = [
	{ value: 'following', label: 'Following' },
	{ value: 'all', label: 'All' },
];
