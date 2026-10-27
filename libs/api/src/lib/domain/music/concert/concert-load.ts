/**
 * What the admin's three Load buttons send and get back.
 *
 * All three are server work: they talk to MusicBrainz and, through the AI
 * gateway, to a model that can search
 * with the project's own credentials, and they cost either requests or money.
 * The client therefore sends what to load, never what to write.
 */

/**
 * Where the admin page opens. Not the only country any more — the page has a
 * picker, and every load takes the country — but a default it must have, and
 * this is the one the catalog's own bands play in.
 */
export const DEFAULT_CONCERT_COUNTRY = 'HU';

/**
 * How far ahead a concert load looks. Six months: a club books a month or two
 * out, a festival a year, and a window longer than this fills the page with
 * nights nobody can buy a ticket for yet.
 */
export const CONCERT_WINDOW_DAYS = 180;

export interface LoadVenuesInput {
	/** ISO 3166-1 alpha-2; `HU` when the client does not say. */
	countryCode?: string;
}

export interface LoadVenuesResult {
	/** Places MusicBrainz returned for the country. */
	scanned: number;
	/** Of those, the ones that are somewhere a concert is played. */
	venues: number;
	written: number;
	/** Already held with the same fields — nothing to write. */
	unchanged: number;
}

export interface LoadConcertsInput {
	countryCode?: string;
	/** Days ahead; `CONCERT_WINDOW_DAYS` when the client does not say. */
	days?: number;
}

export interface LoadConcertsResult {
	/** Catalog artists the load asked MusicBrainz about. */
	artistsQueried: number;
	eventsScanned: number;
	/** Events that turned out to be a catalog artist's, in the country. */
	matched: number;
	written: number;
	/** Concerts whose day has passed, cleared by this run. */
	deleted: number;
	/** Venues the load had to create because no loaded place matched. */
	venuesCreated: number;
}

export interface SuggestConcertsInput {
	countryCode?: string;
	days?: number;
	/**
	 * Which venues to ask about. Empty walks the venues in order, continuing
	 * where the last run stopped — the model is paid per request, so a run
	 * covers a few stages rather than every one of them.
	 */
	venueUids?: string[];
}

export interface SuggestConcertsResult {
	/** Venues whose programme the run asked for. One request each. */
	venuesQueried: number;
	/** Nights those programmes hold, whoever plays them. */
	concertsSeen: number;
	/** Of those, the nights a catalog act plays. */
	proposed: number;
	/** Of those, the ones now waiting for an admin. */
	suggested: number;
	/** Dropped: already filed as a concert. */
	duplicates: number;
	/** Dropped: proposed before and rejected. */
	rejected: number;
	/** Dropped: outside the window, the country, or missing a day. */
	discarded: number;
	/**
	 * Venues the model did not answer about at all. Optional for the same
	 * reason as on the venue run: an older function does not send it.
	 */
	failed?: number;
	/** What the first of those failures said. */
	failure?: string | null;
	/** Which model the gateway picked; recorded beside each proposal. */
	model: string;
	/** What the run cost against the daily cap, and what is left of it. */
	requestsUsed: number;
	requestsLeft: number;
}

/** The admin page's own error, so the Hungarian sentence stays on the client. */
export const CONCERT_AI_DISABLED = 'concert-ai-disabled';
/** The daily cap on model requests is used up. */
export const CONCERT_AI_QUOTA = 'concert-ai-quota';

/**
 * What the AI run may do, as an admin sets it. The prompt is deliberately not
 * among these: it is built on the server from the catalog's own data, so a
 * caller cannot have arbitrary text answered on the project's bill.
 */
export interface ConcertAiSettings {
	/** Whether suggestions are asked for at all. Switched off costs nothing. */
	enabled: boolean;
	/** How many venues one run covers. That is also its request count. */
	venuesARun: number;
	/** The daily cap on model requests, so a mistake cannot cost a fortune. */
	dailyRequestLimit: number;
}

/**
 * What the server falls back to, and what the form starts from.
 *
 * Off by default, and the numbers are small: Google Search grounding is billed
 * per request rather than per token — a few cents a grounded prompt — and one
 * request goes out per venue. A fifty-venue run would spend the whole monthly
 * GCP budget the cost alerts watch. Whoever turns this on decides what it is
 * worth, and the page says what is left of the day's cap.
 */
export const DEFAULT_CONCERT_AI_SETTINGS: ConcertAiSettings = {
	enabled: false,
	venuesARun: 5,
	dailyRequestLimit: 10,
};

/**
 * What a venue proposal run asks about.
 *
 * The country is the whole question in the simple case, and that is one
 * request: a model that searched for a country's concert halls names the
 * twenty or thirty that matter. Cities are for going deeper — one request per
 * city — and that is what fills in a country beyond its capital.
 */
export interface SuggestVenuesInput {
	countryCode?: string;
	/**
	 * Which cities to ask about, one request each. Empty asks about the
	 * country as a whole, which is one request.
	 */
	cities?: string[];
}

export interface SuggestVenuesResult {
	/** How many questions went out: a country is one, a city each is one. */
	asked: number;
	/** Places those answers named, whatever they turned out to be. */
	venuesSeen: number;
	/** Of those, the ones now waiting for an admin. */
	suggested: number;
	/** Dropped: the catalog already holds the venue. */
	duplicates: number;
	/** Dropped: proposed before and turned down. */
	rejected: number;
	/** Dropped: no name, or not a place a concert is played. */
	discarded: number;
	/**
	 * Questions the model did not answer at all.
	 *
	 * Optional because a client can be talking to a function deployed before
	 * this field existed. Without it a run that failed and a run that came
	 * back empty are the same zero on screen, and the reason sits in a log
	 * only whoever opens the Cloud Console will read.
	 */
	failed?: number;
	/** What the first of those failures said. */
	failure?: string | null;
	/** Which model the gateway picked; recorded beside each proposal. */
	model: string;
	requestsUsed: number;
	requestsLeft: number;
}
