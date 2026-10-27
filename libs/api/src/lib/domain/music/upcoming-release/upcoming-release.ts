import { Entity } from '../../../common';

/**
 * A record that has not come out yet, by an artist the catalog already
 * knows. The documents are written by the `refreshUpcomingReleases`
 * function from MusicBrainz once a day; nothing is ever written here from
 * the client.
 *
 * One document is one release group — the album, not the pressing. The
 * pressings it was folded from are what `formats`, `labels` and
 * `countries` carry, so a collector can see whether the record is coming
 * on vinyl at all.
 */
export interface UpcomingRelease {
	/** The catalog artist this was matched to; the page links to it. */
	artistUid: string | null;
	/** The artist as MusicBrainz credits it, which may differ from ours. */
	artistName: string;
	/** Catalog artist photo, so the row has an image before the cover exists. */
	artistImageUrl: string | null;
	countries: string[];
	/**
	 * Whether the match was made on the MusicBrainz id or only on the name.
	 * A name match can be a namesake, and the page says so.
	 */
	matchedBy: UpcomingReleaseMatch;
	/** `Vinyl`, `CD`, `Cassette`… as MusicBrainz names them, deduplicated. */
	formats: string[];
	/**
	 * When the album first came out, `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Null
	 * for a record that has never been released — those are the new ones.
	 */
	firstReleaseDate: string | null;
	labels: string[];
	musicBrainzArtistIds: string[];
	/** The MusicBrainz release group id; also the document id. */
	releaseGroupId: string;
	/** `Album`, `EP`, `Single`… null when MusicBrainz does not say. */
	primaryType: string | null;
	/** The day it comes out, `YYYY-MM-DD`; partial dates are never stored. */
	releaseDate: string;
	/** `Live`, `Compilation`, `Soundtrack`… */
	secondaryTypes: string[];
	title: string;
}

/** How an upcoming release found its catalog artist. */
export type UpcomingReleaseMatch = 'musicBrainzId' | 'name';

export type UpcomingReleaseEntity = UpcomingRelease & Entity;

/** The release group page on MusicBrainz, where the record can be checked. */
export const MUSICBRAINZ_RELEASE_GROUP_URL =
	'https://musicbrainz.org/release-group';

/**
 * The front cover of a release group on the Cover Art Archive. An album that
 * is not out yet usually has none, so the page falls back to the artist
 * photo when this 404s.
 */
export const coverArtUrl = (releaseGroupId: string): string =>
	`https://coverartarchive.org/release-group/${releaseGroupId}/front-250`;
