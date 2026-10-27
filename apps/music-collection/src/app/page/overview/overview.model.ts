/** View models and the dials of the collection overview. */

/**
 * How far back "recently" reaches on the headline numbers. A month is the
 * span a collector actually feels: short enough that the arrow means
 * something this week, long enough that a quiet fortnight does not read as
 * a collection standing still.
 */
export const RECENT_WINDOW_DAYS = 30;

/** How far back the growth line goes. */
export const GROWTH_MONTHS = 12;

/** Records on the "latest arrivals" shelf; the rest is one click away. */
export const RECENT_COUNT = 5;

/** Bands on the top list. Past five it stops being a top list. */
export const TOP_ARTIST_COUNT = 5;

/** One headline number of the overview, with what it did lately. */
export interface OverviewStat {
	/** `track` key, and what the icon is picked by. */
	key: 'copies' | 'artists' | 'styles' | 'labels';
	labelKey: string;
	icon: string;
	value: number;
	/**
	 * How much of the value arrived inside the recent window; `null` where
	 * the question makes no sense for that number.
	 */
	delta: number | null;
}
