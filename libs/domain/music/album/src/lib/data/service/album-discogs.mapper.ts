import {
	AlbumExternalProfile,
	AlbumExternalTrack,
	DiscogsMasterCandidate,
	DiscogsMasterProfile,
	DiscogsMasterTrack,
	discogsMasterUrl,
	toCatalogStyles,
} from '@music-collection/api';

import { toDurationSec } from './album-external.mapper';

/** Title for matching across sources: case and punctuation left out. */
const titleKey = (value: string): string =>
	value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * The Discogs master of the artist with the searched title. Discogs answers a
 * title search widely — reissues, tribute albums and covers of the same name
 * all come back — so only a hit whose artist and title both match is taken,
 * and the earliest of those: a master is the original album, and where several
 * exist the first one is it.
 */
export function pickDiscogsMaster(
	artistName: string,
	name: string,
	candidates: DiscogsMasterCandidate[]
): DiscogsMasterCandidate | null {
	const artist = titleKey(artistName);
	const title = titleKey(name);
	const matches = candidates.filter(
		(candidate) =>
			titleKey(candidate.name) === title &&
			// Discogs leaves the artist out of some hits; the title search
			// already ran on the artist, so an unnamed one is not ruled out.
			(!candidate.artistName || titleKey(candidate.artistName) === artist)
	);

	return (
		[...matches].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))[0] ??
		null
	);
}

/**
 * A Discogs master against the album form's fields. The format stays empty: a
 * master is the album itself, and Discogs keeps the carrier and the release
 * description on its pressings, not on it.
 */
export function toDiscogsAlbumProfile(
	profile: DiscogsMasterProfile
): AlbumExternalProfile {
	return {
		coverImageUrl: profile.coverUrl,
		format: null,
		name: profile.name,
		source: 'discogs',
		sourceUrl: discogsMasterUrl(profile.masterId),
		styles: toCatalogStyles(profile.styles),
		year: profile.year ? new Date(profile.year, 0, 1) : null,
	};
}

/**
 * The master's tracklist. Discogs prints the duration ("4:04") and the catalog
 * keeps the seconds alongside it, so the seconds are derived here — the same
 * way a hand-typed duration is.
 */
export function toDiscogsTracks(
	tracks: DiscogsMasterTrack[]
): AlbumExternalTrack[] {
	return tracks.map((track) => ({
		name: track.name,
		position: track.position,
		duration: track.duration,
		durationSec: toDurationSec(track.duration),
	}));
}
