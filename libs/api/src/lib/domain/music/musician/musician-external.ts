/**
 * A musician's Discogs profile, as the `discogsArtistProfile` callable
 * returns it, to fill in the edit form (Load button).
 */
export interface MusicianExternalProfile {
	/** Discogs artist id. */
	id: number;
	name: string;
	realName: string | null;
	/** Biography with Discogs markup. */
	description: string | null;
	sites: string[];
	aliases: string[];
	nameVariations: string[];
	imageUrl: string | null;
}

/** The form fields an external profile can fill in. */
export type MusicianExternalField = Exclude<
	keyof MusicianExternalProfile,
	'id'
>;

export interface DiscogsArtistProfileRequest {
	artistId: number;
}

/** Callable name of the Discogs artist profile lookup. */
export const DISCOGS_ARTIST_PROFILE_FUNCTION = 'discogsArtistProfile';

/** The Discogs page of an artist. */
export function discogsArtistUrl(artistId: number): string {
	return `https://www.discogs.com/artist/${artistId}`;
}
