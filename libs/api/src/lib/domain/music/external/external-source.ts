/**
 * Which online source an external lookup answered from.
 *
 * MusicBrainz is asked first everywhere: its data is structured — countries,
 * founding years, member relations with the years attached — and it needs no
 * key. Discogs answers where MusicBrainz knows nothing, which happens often
 * with small pressings and lesser-known bands. It goes through a callable, as
 * it needs a token and the answers are worth caching.
 */
export type ExternalSource = 'musicbrainz' | 'discogs';

/** Where a value came from, next to the value itself. */
export interface ExternalSourced {
	source: ExternalSource;
	/** Source page of the match, for checking it is the right one. */
	sourceUrl: string;
}
