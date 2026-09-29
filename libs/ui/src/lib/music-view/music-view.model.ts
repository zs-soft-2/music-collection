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
	| 'gatefold'
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
	/**
	 * The album on a medium, not a known pressing: the collector gave only
	 * the format, so there is no label or country to show.
	 */
	generic: boolean;
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
	/** Artist id — links to `/artist/:artistId`. */
	artistId: string;
	artistName: string;
	coverUrl: string | null;
	year: number | null;
	/** Album type label, e.g. "LP", "EP", "Live". */
	albumType: string | null;
	styles: string[];
	/**
	 * Last write of the catalog entry (epoch ms), 0 when never stamped —
	 * what "new in the catalog" is ordered by.
	 */
	changedAt: number;
}

/** An album of a discography with the formats collected of it. */
export interface DiscographyAlbum extends AlbumView {
	/** Formats of this album in the collection; empty when not collected. */
	ownedFormats: MediaFormat[];
}

/**
 * How sure a photo scan is about a pressing, as the collector reads it —
 * dictionary keys rather than words, because a scan result is shown in the
 * album dialog and on the scan page alike, and both read it in the language
 * in force.
 */
export const MATCH_LABELS: Record<ScanMatch, string> = {
	exact: 'common.match.exact',
	likely: 'common.match.likely',
	possible: 'common.match.possible',
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
