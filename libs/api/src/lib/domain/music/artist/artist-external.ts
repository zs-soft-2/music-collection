import { CountryEnum, FormatEnum, StyleEnum } from '../../../common';
import { ExternalSource } from '../external';
import { ArtistType } from './artist';

/**
 * How far an artist is identified online: the ids of the sources that know
 * it. A load runs on the id it is given and searches only without one.
 */
export interface ArtistExternalIds {
	/** Discogs artist id; null when Discogs has not been asked or matched. */
	discogsArtistId: number | null;
	musicBrainzId: string | null;
}

/**
 * What the form knows about the artist when it is looked up online: the
 * name to search for, and the country and styles that tell the hits of
 * artists sharing a name apart.
 */
export interface ArtistExternalQuery extends Partial<ArtistExternalIds> {
	country?: CountryEnum | null;
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
 * The Discogs artist id in what was typed: a bare id, or any link to the
 * artist page it was copied from. Null when there is neither.
 */
export function toDiscogsArtistId(
	value?: string | number | null
): number | null {
	const digits = String(value ?? '')
		.trim()
		.match(/(?:^|discogs\.com\/artist\/)(\d+)(?:[/?#-]|$)/)?.[1];
	const id = Number(digits);

	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Artist data looked up online to fill in the missing fields of the edit
 * form. Null where the source knows nothing.
 *
 * MusicBrainz (with Wikipedia and Wikimedia Commons) is asked first; where it
 * knows the artist nothing, Discogs answers instead — it has no founding year
 * and no country, so those come back null from it. Where MusicBrainz answers
 * but leaves fields Discogs could fill empty, both are asked and the empty
 * ones filled in; `fillerSourceUrl` then names the second source.
 */
export interface ArtistExternalProfile {
	artistType: ArtistType | null;
	country: CountryEnum | null;
	description: string | null;
	/** Id of the match on Discogs; null when MusicBrainz answered. */
	discogsArtistId: number | null;
	formedIn: Date | null;
	/**
	 * Page of the second source, where it filled in fields the first left
	 * empty; null when one source answered everything it could.
	 */
	fillerSourceUrl: string | null;
	/** Photo on Wikimedia Commons, or on Discogs. */
	imageUrl: string | null;
	/** Id of the match on MusicBrainz; null when Discogs answered. */
	musicBrainzId: string | null;
	name: string;
	/** Which source answered. */
	source: ExternalSource;
	/** Source page of the match, for checking it is the right artist. */
	sourceUrl: string;
	styles: StyleEnum[];
}

/**
 * One of the artists sharing the searched name, as the chooser shows
 * them: what tells this one apart from its namesakes, and the id the
 * load then runs on.
 */
export interface ArtistExternalCandidate extends ArtistExternalIds {
	/** The catalog's country, or the source's own code when it knows none. */
	country: string | null;
	/** Year the artist started; null when the source does not know it. */
	formedIn: Date | null;
	name: string;
	/** The source's own note telling artists of the same name apart. */
	note: string | null;
	/** Which source found this one. */
	source: ExternalSource;
	/** Source page of the hit, for checking which artist this is. */
	sourceUrl: string;
	styles: StyleEnum[];
	/** Thumbnail of the hit, where the source has one (Discogs). */
	thumbUrl: string | null;
	/** `Group`, `Person`… as the source names it; null when unknown. */
	type: string | null;
}

/**
 * The form fields an external profile can fill in. The source itself is not
 * one: it says where the values came from, not what to write down.
 */
export type ArtistExternalField = Exclude<
	keyof ArtistExternalProfile,
	'fillerSourceUrl' | 'source' | 'sourceUrl'
>;

/**
 * An album of the artist found online: a MusicBrainz release group, or an
 * album of a Discogs discography where MusicBrainz knows the artist none.
 */
export interface ArtistExternalAlbum {
	format: FormatEnum;
	name: string;
	/** Which source found it. */
	source: ExternalSource;
	/** Source page of the release group. */
	sourceUrl: string;
	/** First release date; null when the source does not know it. */
	year: Date | null;
}
