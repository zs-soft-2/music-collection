/**
 * Identifying a record from a photo: what the `identifyRecordFromPhoto`
 * callable takes and returns (apps/functions). The candidates it gives back
 * are Discogs pressings — matching them against the catalog happens on the
 * client, which already holds the catalog.
 */

/** The carrier, as the catalog's `media` field spells it. */
export type PhotoMedia = 'vinyl' | 'cd' | 'cassette' | 'dvd';

/** What the model read off the photo. */
export interface PhotoSignals {
	artist: string | null;
	albumTitle: string | null;
	label: string | null;
	/** The catalog number printed on the sleeve or the centre label. */
	catalogNumber: string | null;
	/** Barcode digits, when legible in the photo. */
	barcode: string | null;
	media: PhotoMedia | null;
	country: string | null;
	year: number | null;
	confidence: 'high' | 'medium' | 'low';
}

/**
 * How sure the match is.
 * - `exact`: the barcode or the catalog number matches — this is the pressing.
 * - `likely`: artist and title match, the pressing itself is not settled.
 * - `possible`: partial match; the collector picks.
 */
export type ScanMatch = 'exact' | 'likely' | 'possible';

export interface ScanCandidate {
	/** Discogs release id; `null` when only the master was found. */
	discogsReleaseId: number | null;
	discogsMasterId: number | null;
	title: string;
	artistName: string | null;
	albumName: string | null;
	/** e.g. ["Vinyl", "LP", "Album"]. */
	formats: string[];
	label: string | null;
	catno: string | null;
	country: string | null;
	year: number | null;
	thumbUrl: string | null;
	match: ScanMatch;
}

/** The photo as the client sends it. */
export interface ScanPhoto {
	/** Base64, without the data-URL prefix. */
	data: string;
	mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * The album the photo is known to be of — set when the scan starts from an
 * album page, where only the pressing is in question. It narrows the search
 * and outranks what the model reads off a blurred sleeve.
 */
export interface ScanAlbumContext {
	name: string;
	artistName: string | null;
}

export interface IdentifyRecordFromPhotoRequest {
	photo: ScanPhoto | null;
	/** Decoded on the client; with it the model may not need to run at all. */
	barcode: string | null;
	/** Known album, when the collector scans from its page. */
	album?: ScanAlbumContext | null;
}

export interface IdentifyRecordFromPhotoResponse {
	/** What the model read; `null` when the barcode alone settled it. */
	signals: PhotoSignals | null;
	candidates: ScanCandidate[];
	/** Whether the model ran — what this scan cost. */
	usedVision: boolean;
}

/** Callable name of the photo identification (apps/functions). */
export const IDENTIFY_RECORD_FROM_PHOTO_FUNCTION = 'identifyRecordFromPhoto';
