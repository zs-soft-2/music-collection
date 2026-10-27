/**
 * The `discogsLookup` callable: the catalog's fallback for the artist and
 * album forms, and for the line-up, when MusicBrainz has no answer.
 *
 * One callable answers all five questions — the europe-west4 Cloud Run region
 * has a 20 vCPU quota that every new function eats into. The shapes here are
 * the same ones `apps/functions/src/discogs-lookup.ts` returns; the functions
 * app is a separate npm project and cannot import from `libs`, so the two must
 * be kept together.
 */

/** Callable name of the Discogs lookup. */
export const DISCOGS_LOOKUP_FUNCTION = 'discogsLookup';

/** One band of the searched name, as the chooser lists them. */
export interface DiscogsArtistCandidate {
	discogsId: number;
	name: string;
	thumbUrl: string | null;
}

/**
 * One member of a band. Discogs keeps no years for members, only whether
 * they are in the current line-up — that is what MusicBrainz is asked first
 * for.
 */
export interface DiscogsBandMember {
	discogsId: number | null;
	name: string;
	active: boolean;
}

/**
 * A band's profile. What Discogs does not know: the founding year and the
 * country, which is why a MusicBrainz hit is always preferred.
 */
export interface DiscogsBandProfile {
	discogsId: number;
	name: string;
	/** Profile text with Discogs markup. */
	description: string | null;
	sites: string[];
	imageUrl: string | null;
	/** Discogs' own style and genre names; the mapper turns them into styles. */
	styles: string[];
	members: DiscogsBandMember[];
}

/** One album of a band's Discogs discography. */
export interface DiscogsArtistAlbum {
	/** Master id where Discogs has one, the pressing's id otherwise. */
	id: number;
	type: 'master' | 'release';
	name: string;
	year: number | null;
	thumbUrl: string | null;
	/** "LP", "Album", "EP"… as much as Discogs says about this entry. */
	formats: string[];
}

/** One track of a Discogs master's tracklist. */
export interface DiscogsMasterTrack {
	/** Position as printed, e.g. "A1", "3". */
	position: string;
	name: string;
	/** Duration as Discogs keeps it, "4:04"; null when it knows none. */
	duration: string | null;
}

/**
 * An album on Discogs: profile, cover and tracklist in one call — the
 * MusicBrainz route needs three (release group, Cover Art Archive, release).
 */
export interface DiscogsMasterProfile {
	masterId: number;
	name: string;
	artistName: string | null;
	year: number | null;
	/** Discogs' own style and genre names, styles first. */
	styles: string[];
	coverUrl: string | null;
	tracks: DiscogsMasterTrack[];
}

/** One album of the searched title, as the chooser lists them. */
export interface DiscogsMasterCandidate {
	masterId: number;
	name: string;
	artistName: string | null;
	year: number | null;
	thumbUrl: string | null;
}

/** What the callable is asked; the `kind` decides the rest of the request. */
export type DiscogsLookupRequest =
	| { kind: 'artist-search'; name: string }
	| { kind: 'artist-profile'; discogsId: number }
	| { kind: 'artist-albums'; discogsId: number }
	| { kind: 'master-search'; artist: string; album: string }
	| { kind: 'master-profile'; masterId: number };

/** The answer to each `kind`, keyed by it. */
export interface DiscogsLookupResponse {
	'artist-search': { candidates: DiscogsArtistCandidate[] };
	'artist-profile': { profile: DiscogsBandProfile };
	'artist-albums': { albums: DiscogsArtistAlbum[] };
	'master-search': { candidates: DiscogsMasterCandidate[] };
	'master-profile': { profile: DiscogsMasterProfile };
}

/** The Discogs page of a master (an album with all its pressings). */
export function discogsMasterUrl(masterId: number): string {
	return `https://www.discogs.com/master/${masterId}`;
}
