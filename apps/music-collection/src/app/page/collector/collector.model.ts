import { MediaEnum } from '@music-collection/common/api';
import { MediaFormat } from '@music-collection/ui/music-view';

/**
 * The public page of one collector, as this page draws it.
 *
 * Everything here came out of a document written by the collector's own
 * browser, which makes it somebody else's data however friendly its owner is:
 * the mapper that builds these views is where it stops being that and becomes
 * something this page may render.
 */

/** Who the page is about. */
export interface CollectorHeroView {
	displayName: string | null;
	photoURL: string | null;
	/** Stands in for a missing picture. */
	initial: string;
	/** "Budapest, Hungary", or just the country — whatever was shared. */
	place: string | null;
	/** Epoch ms of the snapshot; the page says how long ago that was. */
	updatedAt: number | null;
}

export interface CollectorFormatView {
	format: MediaFormat;
	count: number;
}

export interface CollectorNumbersView {
	copies: number;
	albums: number;
	artists: number;
	oldestYear: number | null;
	since: number | null;
	formats: CollectorFormatView[];
}

export interface CollectorBadgeView {
	name: string;
	imageUrl: string | null;
	points: number;
}

export interface CollectorPursuitView {
	name: string;
	/**
	 * How far along, where that is published at all.
	 *
	 * Null on a page built from the directory entry alone: how many of a
	 * collection somebody owns is a fact about their shelf, and the shelf is
	 * the other consent. Such a page names the hunt and stops there.
	 */
	progress: CollectorProgressView | null;
}

export interface CollectorProgressView {
	owned: number;
	total: number;
	/** 0–100, rounded. */
	percentage: number;
}

export interface CollectorRecordView {
	title: string;
	artistName: string;
	year: number | null;
	format: MediaFormat;
	coverUrl: string | null;
	editions: string[];
}

export interface CollectorWishView {
	title: string;
	artistName: string;
	coverUrl: string | null;
	medias: MediaEnum[];
	/** Where it is for sale, where that is a web address we may offer. */
	sourceLink: string | null;
	/** The host of that address, so a visitor sees where they are going. */
	sourceHost: string | null;
}

/**
 * A record the collector thinks highly of, as this page dares to show it:
 * the stars only where they are stars this app could have given.
 */
export interface CollectorFavouriteView {
	title: string;
	artistName: string;
	stars: number;
	/** What they wrote about it, clipped; empty where they wrote nothing. */
	note: string;
}

/** One record of the full shelf — the list behind the window. */
export interface CollectorAlbumView {
	title: string;
	artistName: string;
	year: number | null;
	format: MediaFormat;
}

/** The whole shelf as the page draws it, once a visitor asks for it. */
export interface CollectorAlbumsView {
	/** Everything on the shelf, even where the list itself had to stop. */
	count: number;
	albums: CollectorAlbumView[];
}

export interface CollectorView {
	/**
	 * Whether there is a shelf behind the name.
	 *
	 * False for a page built from the directory entry: the collector showed
	 * what they are after and nothing else, so the page is their name and
	 * those hunts. Everything counted — records, points, formats, the window
	 * of covers — belongs to the shelf, and a page that drew zeros for them
	 * would be saying something the collector never said.
	 */
	hasShelf: boolean;
	hero: CollectorHeroView;
	numbers: CollectorNumbersView;
	points: { total: number; completedCollections: number };
	badges: CollectorBadgeView[];
	pursuits: CollectorPursuitView[];
	showcase: CollectorRecordView[];
	wishlist: CollectorWishView[];
	favourites: CollectorFavouriteView[];
}

/** How much of a text out of the document may reach the page. */
export const TITLE_MAX = 200;
export const NAME_MAX = 120;
export const EDITION_MAX = 40;
/** How much of a line about a record reaches the page. */
export const NOTE_MAX = 280;
/** How many edition tags one record may boast. */
export const EDITIONS_MAX = 4;
