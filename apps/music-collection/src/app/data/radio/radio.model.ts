/** Where a radio station gets its records from. */
export type RadioStationKind =
	/**
	 * The week's own station: the band of the week every fourth record, the
	 * rest taste and the open catalog. The station the radio opens on.
	 */
	| 'week'
	/** What the catalog has taken in most recently. */
	| 'new'
	/** What answers to the styles the collector owns most. */
	| 'taste'
	/** The catalog, in no order at all. */
	| 'random'
	/** The collector's own copies: the whole shelf, a unit, a compartment. */
	| 'shelf'
	/** One published collection, whether or not the records are owned. */
	| 'collection';

/** One station, as a page asks for it and the player plays it. */
export interface RadioStation {
	kind: RadioStationKind;
	/** Shelf station: the drawn unit; null reaches the whole collection. */
	unitId?: string | null;
	/** Shelf station: one compartment of that unit. */
	row?: number | null;
	column?: number | null;
	/** Collection station: the collection's slug. */
	slug?: string | null;
}

/** A record of the catalog as a list of what a station holds names it. */
export interface RadioRecordName {
	albumTitle: string;
	artistName: string | null;
}

/** How many records a station puts in the queue. */
export const RADIO_LENGTH = 25;

/** How many of the collector's styles count as their taste. */
export const TASTE_STYLES = 6;

/**
 * How often the band of the week comes round on their own station: every
 * fourth record is theirs. Often enough to be the week's band, rarely enough
 * that the hour is still about the catalog.
 */
export const BAND_OF_THE_WEEK_EVERY = 4;

/**
 * And how the three records between them are chosen: taste and the open
 * catalog every other place. A collector without a shelf has no taste to go
 * on yet, and hears the catalog alone.
 */
export const TASTE_EVERY = 2;

/** The same station twice is the same string: what a list tracks by. */
export function radioStationId(station: RadioStation): string {
	const where = [station.unitId, station.row, station.column, station.slug]
		.filter((part) => part !== null && part !== undefined)
		.join(':');

	return where ? `${station.kind}:${where}` : station.kind;
}
