/**
 * The two collections the concert pages stand on, and the feature keys their
 * documents sync under.
 *
 * A venue is kept apart from the concerts held in it because a venue is
 * durable and a concert is not: the hall stays while the night passes. The
 * venues are loaded once from MusicBrainz and corrected by hand; the concerts
 * come and go with every load.
 */
export const VENUE_FEATURE_KEY = 'venue';
export const CONCERT_FEATURE_KEY = 'concert';
/**
 * Where a loaded concert waits for an admin. Only what an admin has looked at
 * moves to `concert`, so the public page can never show a hallucination.
 */
export const CONCERT_SUGGESTION_FEATURE_KEY = 'concert-suggestion';
