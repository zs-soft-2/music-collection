import { RadioStation } from '../../data/radio';

/** One station as the page offers it. */
export interface RadioStationView {
	/** Stable `track` key. */
	id: string;
	station: RadioStation;
	label: string;
	/** What it puts on, in one line. */
	description: string;
	/** PrimeIcons class for the card. */
	icon: string;
	/** Records it would play; 0 keeps it off the page. */
	count: number;
}

/**
 * A station before its records have been counted. A collection knows its own
 * size — it was resolved to draw the page already — so only the stations that
 * do not have to ask.
 */
export type CountedStation = Omit<RadioStationView, 'count'> & {
	count: number | null;
};
