/**
 * What the app measures. The list is closed on purpose: an event has to be
 * named here before it can be sent, so whoever asks what we collect can read
 * the answer in one place — including us, a year from now.
 *
 * The names are GA4's: at most 40 characters, letters, digits and
 * underscores. Where GA4 already has a name for something (`login`,
 * `page_view`, `add_to_wishlist`), we use theirs, so the built-in reports
 * fill up by themselves.
 */
export type AnalyticsEventName =
	/** A page of the app was opened. Sent by the measurement itself. */
	| 'page_view'
	/** Someone signed in — not a session restored on reload. */
	| 'login'
	/** A copy was filed into the collection. */
	| 'add_to_collection'
	/** A record was put on the wishlist. */
	| 'add_to_wishlist'
	/** A copy was given a place on the drawn shelf, or taken off it. */
	| 'shelf_placement_changed'
	/**
	 * Someone searched the catalog and stopped typing. Carries how many
	 * records the term turned up — never the term: whether the search finds
	 * what people come for is the question, not what they come for.
	 */
	| 'search'
	/** A collector asked for a release the catalog does not have yet. */
	| 'release_requested'
	/**
	 * Photos of a copy were added, replaced or removed. Carries how many the
	 * copy is left with — never the pictures or what they show.
	 */
	| 'copy_photos_changed';

/**
 * An event's parameters. Nothing here may name a record, a person or a place
 * a user typed: these events answer which parts of the app are used, not who
 * used them or what they own. Keep them to counts, kinds and flags.
 */
export type AnalyticsEventParameters = Record<
	string,
	string | number | boolean
>;

/**
 * Measurement, as the rest of the app sees it: a name and a few parameters.
 * Whether anything actually leaves the browser — the collector's consent, the
 * environment, whether the SDK loaded at all — is the implementation's
 * business, so a caller never has to ask first and a dropped event is never
 * an error.
 */
export abstract class AnalyticsService {
	public abstract track(
		name: AnalyticsEventName,
		parameters?: AnalyticsEventParameters
	): void;
}
