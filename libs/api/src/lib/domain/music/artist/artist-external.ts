import { CountryEnum, StyleEnum } from '../../../common';
import { ArtistType } from './artist';

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
	name: string;
	/** Source page of the match, for checking it is the right artist. */
	sourceUrl: string;
	styles: StyleEnum[];
}

/** The form fields an external profile can fill in. */
export type ArtistExternalField = Exclude<
	keyof ArtistExternalProfile,
	'sourceUrl'
>;
