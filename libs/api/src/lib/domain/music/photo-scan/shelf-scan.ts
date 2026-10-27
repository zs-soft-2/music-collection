/**
 * Reading a whole shelf compartment off photos: what the
 * `identifyShelfFromPhotos` callable takes and returns (apps/functions).
 *
 * Where `photo-scan.ts` identifies one record, this one reads every spine in
 * a compartment. Two photos of the same compartment, taken from different
 * angles, are read separately and then merged: what the two readings disagree
 * on is what the collector has to look at, and everything else they can trust
 * without checking. The pressings themselves are not looked up here — that
 * happens later, for the rows the collector actually submits.
 */

import { PhotoMedia, PhotoSignals, ScanPhoto } from './photo-scan';

/** One spine in the compartment, numbered from the top. */
export interface ShelfSpine extends PhotoSignals {
	/** From 1: the topmost record of a flat stack, or the leftmost upright. */
	position: number;
	/** Visible, but nothing can be read off it. */
	unreadable: boolean;
}

/** The fields the two readings can differ on. */
export type SpineField =
	'artist' | 'albumTitle' | 'label' | 'catalogNumber' | 'barcode' | 'year';

/** A spine after the two readings were merged. */
export interface ShelfScanSpine extends ShelfSpine {
	/** Fields the two photos read differently — these ask for a look. */
	conflicts: SpineField[];
	/** The other photo's reading where it differs, to take in one tap. */
	alternatives: Partial<Record<SpineField, string | number | null>>;
	/** How many photos this spine appeared on: 1 or 2. */
	seenOn: number;
}

export interface IdentifyShelfRequest {
	/** One or two photos of the same compartment, from different angles. */
	photos: ScanPhoto[];
	/** The carrier, when the whole compartment holds the same one. */
	media?: PhotoMedia | null;
}

export interface IdentifyShelfResponse {
	spines: ShelfScanSpine[];
	/**
	 * How many spines each photo counted, independently of how many could be
	 * read. Two different numbers mean a record is missing from the list.
	 */
	spineCounts: number[];
	/** Whether the model ran — what this scan cost. */
	usedVision: boolean;
}

/** Callable name of the shelf reading (apps/functions). */
export const IDENTIFY_SHELF_FUNCTION = 'identifyShelfFromPhotos';

/** At most two photos of one compartment; a third adds cost, not certainty. */
export const MAX_SHELF_PHOTOS = 2;
