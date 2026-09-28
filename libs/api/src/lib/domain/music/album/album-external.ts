import { FormatEnum, StyleEnum } from '../../../common';
import { ExternalSource } from '../external';

/**
 * Album data looked up online to fill in the missing fields of the edit form.
 * Null where the source knows nothing.
 *
 * MusicBrainz and the Cover Art Archive are asked first; where they know the
 * album nothing, the Discogs master answers instead — one call there carries
 * the profile, the cover and the tracklist. Where MusicBrainz has the album but
 * leaves the cover or the styles empty — a release group with no cover art is
 * common — both are asked and the empty fields filled in; `fillerSourceUrl`
 * then names the second source.
 */
export interface AlbumExternalProfile {
	/** Front cover on the Cover Art Archive, or on Discogs. */
	coverImageUrl: string | null;
	/**
	 * Page of the second source, where it filled in fields the first left
	 * empty; null when one source answered everything it could.
	 */
	fillerSourceUrl: string | null;
	format: FormatEnum | null;
	name: string;
	/** Which source answered. */
	source: ExternalSource;
	/** Source page of the match, for checking it is the right album. */
	sourceUrl: string;
	styles: StyleEnum[];
	/** First release date. */
	year: Date | null;
}

/** The form fields an external profile can fill in. */
export type AlbumExternalField = Exclude<
	keyof AlbumExternalProfile,
	'fillerSourceUrl' | 'source' | 'sourceUrl'
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
	/** Which source the tracklist came from. */
	source: ExternalSource;
	/** Source page of the release. */
	sourceUrl: string;
}
