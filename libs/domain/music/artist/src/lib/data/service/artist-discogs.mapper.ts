import {
	ArtistExternalAlbum,
	ArtistExternalCandidate,
	ArtistExternalProfile,
	DiscogsArtistAlbum,
	DiscogsArtistCandidate,
	discogsArtistUrl,
	DiscogsBandProfile,
	discogsMasterUrl,
	discogsReleaseUrl,
	StyleName,
	toCatalogStyles,
	toDiscogsAlbumFormat,
} from '@music-collection/api';

/**
 * A Discogs artist hit as the chooser lists it. Discogs knows no country, no
 * founding year and no disambiguation note for an artist, so the name and the
 * thumbnail are all the admin has to go by — which is why MusicBrainz is asked
 * first and this list only comes up when it found nothing.
 */
export function toDiscogsCandidate(
	hit: DiscogsArtistCandidate
): ArtistExternalCandidate {
	return {
		country: null,
		discogsArtistId: hit.discogsId,
		formedIn: null,
		musicBrainzId: null,
		name: hit.name,
		note: null,
		source: 'discogs',
		sourceUrl: discogsArtistUrl(hit.discogsId),
		styles: [],
		thumbUrl: hit.thumbUrl,
		type: null,
	};
}

/**
 * A Discogs band profile against the form's fields. Four of them stay empty
 * whatever Discogs knows: it keeps no country, no founding year and no genres
 * for an artist — the styles live on its releases, not on the band — and its
 * artist type is not stated. A member list is the one hint about the type:
 * only a group has one.
 *
 * The description keeps its Discogs markup, as the imported ones do; the
 * artist page cleans it when it shows it.
 */
export function toDiscogsProfile(
	profile: DiscogsBandProfile,
	known: readonly StyleName[]
): ArtistExternalProfile {
	return {
		artistType: profile.members.length ? 'band' : null,
		country: null,
		description: profile.description,
		discogsArtistId: profile.discogsId,
		fillerSourceUrl: null,
		formedIn: null,
		imageUrl: profile.imageUrl,
		musicBrainzId: null,
		name: profile.name,
		source: 'discogs',
		sourceUrl: discogsArtistUrl(profile.discogsId),
		styles: toCatalogStyles(profile.styles, known),
	};
}

/**
 * One album of a Discogs discography; null where Discogs gives no year.
 *
 * The catalog's album must have one, and applying the list would date an
 * undated album to 1970 — a wrong year written into the catalog is worse than
 * an album the admin adds by hand. The MusicBrainz route drops a release group
 * of unknown date for the same reason.
 */
export function toDiscogsAlbum(
	album: DiscogsArtistAlbum
): ArtistExternalAlbum | null {
	return album.year
		? {
				format: toDiscogsAlbumFormat(album.formats, album.name),
				name: album.name,
				source: 'discogs',
				sourceUrl:
					album.type === 'master'
						? discogsMasterUrl(album.id)
						: discogsReleaseUrl(album.id),
				year: new Date(album.year, 0, 1),
			}
		: null;
}

/**
 * The fields of an artist profile Discogs could fill in where MusicBrainz left
 * them empty. Country, founding year and styles are not among them: Discogs
 * keeps none of the three for an artist, so asking it about them is pointless.
 * The Discogs id is, because carrying it back means the discography and the
 * line-up start from an id next time instead of searching the name again.
 */
const ARTIST_GAPS = ['description', 'discogsArtistId', 'imageUrl'] as const;

/** Whether the profile still has a field Discogs might know. */
export function hasArtistGaps(profile: ArtistExternalProfile): boolean {
	return ARTIST_GAPS.some((field) => profile[field] === null);
}

/**
 * The first profile with its empty fields filled in from the second. What the
 * first source knows always wins, and `fillerSourceUrl` names the second only
 * where it actually filled something.
 */
export function fillArtistGaps(
	base: ArtistExternalProfile,
	filler: ArtistExternalProfile
): ArtistExternalProfile {
	const merged: ArtistExternalProfile = {
		...base,
		description: base.description ?? filler.description,
		discogsArtistId: base.discogsArtistId ?? filler.discogsArtistId,
		imageUrl: base.imageUrl ?? filler.imageUrl,
	};
	const filled = ARTIST_GAPS.some((field) => merged[field] !== base[field]);

	return { ...merged, fillerSourceUrl: filled ? filler.sourceUrl : null };
}
