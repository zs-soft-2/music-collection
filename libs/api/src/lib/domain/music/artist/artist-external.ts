import { CountryEnum, FormatEnum, StyleEnum } from '../../../common';
import { ArtistType } from './artist';

/**
 * What the form knows about the artist when it is looked up online: the
 * name to search for, and the country and styles that tell the hits of
 * artists sharing a name apart.
 */
export interface ArtistExternalQuery {
	country?: CountryEnum | null;
	/** The artist's MusicBrainz id; with one the name is not searched on. */
	musicBrainzId?: string | null;
	name: string;
	styles?: StyleEnum[];
}

/** The artist pages of MusicBrainz, one id away. */
export const MUSICBRAINZ_ARTIST_URL = 'https://musicbrainz.org/artist';

/**
 * The MusicBrainz id in what was typed: a bare id, or any link to the
 * artist page it was copied from. Null when there is neither.
 */
export function toMusicBrainzId(value?: string | null): string | null {
	return (
		value
			?.trim()
			.match(
				/(?:^|musicbrainz\.org\/artist\/)([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:[/?#]|$)/i
			)?.[1]
			?.toLowerCase() ?? null
	);
}

/**
 * Artist data looked up online (MusicBrainz, Wikipedia) to fill in the
 * missing fields of the edit form. Null where the source knows nothing.
 */
export interface ArtistExternalProfile {
	artistType: ArtistType | null;
	country: CountryEnum | null;
	description: string | null;
	formedIn: Date | null;
	/** Photo on Wikimedia Commons. */
	imageUrl: string | null;
	/** The id of the match, to look the artist up by next time. */
	musicBrainzId: string;
	name: string;
	/** Source page of the match, for checking it is the right artist. */
	sourceUrl: string;
	styles: StyleEnum[];
}

/**
 * One of the artists sharing the searched name, as the chooser shows
 * them: what tells this one apart from its namesakes, and the id the
 * load then runs on.
 */
export interface ArtistExternalCandidate {
	/** The catalog's country, or the source's own code when it knows none. */
	country: string | null;
	/** Year the artist started; null when the source does not know it. */
	formedIn: Date | null;
	musicBrainzId: string;
	name: string;
	/** The source's own note telling artists of the same name apart. */
	note: string | null;
	/** Source page of the hit, for checking which artist this is. */
	sourceUrl: string;
	styles: StyleEnum[];
	/** `Group`, `Person`… as the source names it; null when unknown. */
	type: string | null;
}

/** The form fields an external profile can fill in. */
export type ArtistExternalField = Exclude<
	keyof ArtistExternalProfile,
	'sourceUrl'
>;

/** An album of the artist found online (a MusicBrainz release group). */
export interface ArtistExternalAlbum {
	format: FormatEnum;
	name: string;
	/** Source page of the release group. */
	sourceUrl: string;
	/** First release date; null when the source does not know it. */
	year: Date | null;
}
