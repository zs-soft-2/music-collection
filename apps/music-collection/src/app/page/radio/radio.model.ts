import { RadioRecordName, RadioStation } from '../../data/radio';

/** How many records a station names before it leaves the rest to the count. */
export const PREVIEW_COUNT = 3;

/** One station as the page offers it. */
export interface RadioStationView {
	/** Stable `track` key. */
	id: string;
	station: RadioStation;
	/**
	 * What the station is called, already in the reader's language.
	 *
	 * Words, not a key: half the stations are named after a shelf unit or a
	 * collection the collector named themselves, and those are not ours to
	 * translate. The ones that are ours go through the dictionary where they
	 * are built.
	 */
	label: string;
	/** What it puts on, in one line; likewise already in the language. */
	description: string;
	/** PrimeIcons class for the card. */
	icon: string;
	/** Records it would play; 0 keeps it off the page. */
	count: number;
	/**
	 * The first few of those, named. A station that only says "25 records"
	 * asks to be trusted; one that names three of them can be judged before
	 * it is put on.
	 */
	preview: RadioRecordName[];
}

/**
 * A station before its records have been counted. A collection knows its own
 * size — it was resolved to draw the page already — so only the stations that
 * do not have to ask.
 */
export type CountedStation = Omit<RadioStationView, 'count' | 'preview'> & {
	count: number | null;
	/** What it would put on, where that is already known; null to go and ask. */
	albumIds: string[] | null;
};
