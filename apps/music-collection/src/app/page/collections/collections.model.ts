import { MusicCollectionMembership } from '@music-collection/domain/music-collection/api';

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
	/** Covers of the first albums, for a collection without artwork. */
	covers: string[];
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
}

/** Which albums the detail page lists. */
export type AlbumFilter = 'all' | 'missing' | 'owned';

export const ALBUM_FILTER_OPTIONS: { value: AlbumFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'owned', label: 'Owned' },
	{ value: 'missing', label: 'Missing' },
];
