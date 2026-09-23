/** What the page shows of one record that has not come out yet. */
export interface UpcomingReleaseView {
	artistImageUrl: string | null;
	artistName: string;
	/** Null when the record was matched to no catalog artist at all. */
	artistUid: string | null;
	/** Cover Art Archive front, which an unreleased album rarely has yet. */
	coverUrl: string;
	/** `UK · US`, empty when no pressing names a country. */
	countries: string;
	formats: string[];
	/** Whether a vinyl pressing is among them. */
	onVinyl: boolean;
	labels: string;
	/**
	 * Whether this is a record that has never been out, or a new pressing of
	 * an old one. A collector wants both, but not for the same reason.
	 */
	kind: UpcomingReleaseKind;
	/**
	 * Matched to the catalog artist on the name alone, so it may be a
	 * namesake. The row says so rather than claiming more than it knows.
	 */
	namesake: boolean;
	/** The year the album first came out; only set for a reissue. */
	originalYear: string | null;
	releaseDate: string;
	/** The release group page on MusicBrainz, where the record can be checked. */
	sourceUrl: string;
	title: string;
	/** `Album`, `EP · Live`… empty when MusicBrainz says nothing. */
	typeLabel: string;
	uid: string;
}

export type UpcomingReleaseKind = 'new' | 'reissue';

/** One day of the timeline, with everything that lands on it. */
export interface UpcomingDayView {
	/** `Today`, `Tomorrow`, `in 9 days`. */
	countdown: string;
	day: string;
	key: string;
	releases: UpcomingReleaseView[];
	weekday: string;
}

/** The days of one month, as the timeline breaks them up. */
export interface UpcomingMonthView {
	days: UpcomingDayView[];
	key: string;
	label: string;
}

/** Which records the page is showing. */
export type UpcomingFilter = 'all' | 'new' | 'reissue';

export const UPCOMING_FILTER_OPTIONS: {
	label: string;
	value: UpcomingFilter;
}[] = [
	{ label: 'Everything', value: 'all' },
	{ label: 'New records', value: 'new' },
	{ label: 'Reissues', value: 'reissue' },
];
