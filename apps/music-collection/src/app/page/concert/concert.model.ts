/** What the page shows of one night. */
export interface ConcertView {
	artistImageUrl: string | null;
	artistName: string;
	artistUid: string;
	/** `Budapest Park`, and the address under it when the venue is known. */
	venueName: string;
	venueAddress: string | null;
	city: string | null;
	/** The venue's own MusicBrainz page, for a reader who wants to check. */
	venueUrl: string | null;
	startsAt: string;
	/** `19:30`, or null when no source said when it starts. */
	startsAtTime: string | null;
	/** `2026-10-04 — 2026-10-06` for a festival run; null for one night. */
	endsAt: string | null;
	/**
	 * What the night is called. A title that only repeats the bill is dropped
	 * for the credited artist's name instead — see `titleIsArtist`.
	 */
	title: string;
	/**
	 * Whether the title is the credited artist and nothing more. The card then
	 * prints it once, as the link to the artist, rather than twice.
	 */
	titleIsArtist: boolean;
	eventType: 'concert' | 'festival' | 'other';
	cancelled: boolean;
	/** The whole bill, act by act, linked where the catalog holds the band. */
	lineup: ConcertActView[];
	ticketUrl: string | null;
	/** Where the claim comes from — the thing that makes it checkable. */
	sourceUrl: string | null;
	/**
	 * Whether a person let this through. An mbid-anchored concert says
	 * `musicbrainz`; one an admin approved says so too, because a reader may
	 * reasonably weigh them differently.
	 */
	source: 'musicbrainz' | 'ai' | 'manual';
	uid: string;
}

/** One act on the bill, as the card prints it. */
export interface ConcertActView {
	name: string;
	/** The catalog artist, when the name was matched to one; null otherwise. */
	artistUid: string | null;
}

/** One day of the timeline, with every concert on it. */
export interface ConcertDayView {
	/** `Ma`, `Holnap`, `9 nap múlva`. */
	countdown: string;
	day: string;
	key: string;
	concerts: ConcertView[];
	weekday: string;
}

/** The days of one month, as the timeline breaks them up. */
export interface ConcertMonthView {
	days: ConcertDayView[];
	key: string;
	/** The month's name, written by Intl in the reader's own locale. */
	label: string;
}

/** Which nights the page is showing. */
export type ConcertFilter = 'all' | 'concert' | 'festival';

export const CONCERT_FILTER_OPTIONS: {
	labelKey: string;
	value: ConcertFilter;
}[] = [
	{ labelKey: 'page.concert.filter.all', value: 'all' },
	{ labelKey: 'page.concert.filter.concerts', value: 'concert' },
	{ labelKey: 'page.concert.filter.festivals', value: 'festival' },
];
