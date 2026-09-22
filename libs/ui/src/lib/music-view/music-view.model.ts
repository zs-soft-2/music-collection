import {
	ArtistType,
	CollectionItemPlacement,
	ScanMatch,
} from '@music-collection/api';

/**
 * Presentation models shared by the music pages (home, collection).
 *
 * Components render these flat view-models, never the domain entities: the
 * mappers (`music-view.mapper.ts`) are the single place where a domain entity is
 * translated into what the UI shows.
 */

export type MediaFormat =
	'vinyl' | 'cd' | 'cassette' | 'dvd' | 'boxset' | 'other';

export type EditionTag =
	| 'limited edition'
	| 'deluxe edition'
	| 'reissue'
	| 'remastered'
	| 'box set'
	| 'picture disc';

export interface ReleaseView {
	/** Collection item id — stable `track` key. */
	id: string;
	/** Album id — the card links to `/album/:albumId`. */
	albumId: string;
	/** Catalog release (pressing) the item is a copy of; none on a wish. */
	releaseId: string | null;
	title: string;
	/** Artist id — links to `/artist/:artistId`. */
	artistId: string;
	artistName: string;
	coverUrl: string | null;
	format: MediaFormat;
	/** Album type label, e.g. "LP", "EP", "Live". */
	albumType: string | null;
	year: number | null;
	styles: string[];
	editions: EditionTag[];
	/** Pressing weight in grams (180g vinyl). */
	weight: number | null;
	boxSet: boolean;
	pictureDisc: boolean;
	/** When the item was added to the collection (epoch ms). */
	addedAt: number;
	/** Label and country of the collected pressing. */
	labelName: string | null;
	country: string | null;
	/** Where the collector filed the copy; `null` leaves it to the shelf. */
	placement: CollectionItemPlacement | null;
}

export interface ArtistView {
	id: string;
	name: string;
	/** Band, project or formation; `band` when not set. */
	type: ArtistType;
	/** Square portrait / band photo. */
	imageUrl: string | null;
	/** Wide header photo, falls back to the portrait. */
	headerUrl: string | null;
	styles: string[];
	country: string | null;
	formedYear: number | null;
}

export interface ArtistTileView extends ArtistView {
	/** Releases of this artist in the collection. */
	releaseCount: number;
}

export interface AlbumView {
	id: string;
	title: string;
	artistName: string;
	coverUrl: string | null;
	year: number | null;
	/** Album type label, e.g. "LP", "EP", "Live". */
	albumType: string | null;
	styles: string[];
}

/** An album of a discography with the formats collected of it. */
export interface DiscographyAlbum extends AlbumView {
	/** Formats of this album in the collection; empty when not collected. */
	ownedFormats: MediaFormat[];
}

/** How sure a photo scan is about a pressing, as the collector reads it. */
export const MATCH_LABELS: Record<ScanMatch, string> = {
	exact: 'Exact match',
	likely: 'Likely',
	possible: 'Possible',
};

export const FORMAT_LABELS: Record<MediaFormat, string> = {
	vinyl: 'Vinyl',
	cd: 'CD',
	cassette: 'Cassette',
	dvd: 'DVD',
	boxset: 'Box set',
	other: 'Other',
};

/** Display order of formats (stats, filter chips, shelf sections). */
export const FORMAT_ORDER: MediaFormat[] = [
	'vinyl',
	'cd',
	'cassette',
	'dvd',
	'boxset',
	'other',
];
