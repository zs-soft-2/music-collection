import { FormatEnum, StyleEnum } from '../../../common';

/**
 * Album data looked up online (MusicBrainz, Cover Art Archive) to fill in
 * the missing fields of the edit form. Null where the source knows nothing.
 */
export interface AlbumExternalProfile {
	/** Front cover on the Cover Art Archive. */
	coverImageUrl: string | null;
	format: FormatEnum | null;
	name: string;
	/** Source page of the match, for checking it is the right album. */
	sourceUrl: string;
	styles: StyleEnum[];
	/** First release date. */
	year: Date | null;
}

/** The form fields an external profile can fill in. */
export type AlbumExternalField = Exclude<
	keyof AlbumExternalProfile,
	'sourceUrl'
>;

/** One track of the tracklist found online. */
export interface AlbumExternalTrack {
	name: string;
	/** Position as printed on the release, e.g. "3", "A1". */
	position: string | null;
	/** Duration as "m:ss". */
	duration: string | null;
	durationSec: number | null;
}

/** Tracklist of the album found online. */
export interface AlbumExternalTracks {
	/** Tracks of the earliest official release, in play order. */
	tracks: AlbumExternalTrack[];
	/** Source page of the release. */
	sourceUrl: string;
}
