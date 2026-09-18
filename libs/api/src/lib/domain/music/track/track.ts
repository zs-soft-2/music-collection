import { Entity } from '../../../common';

/** One track of an album, in play order (imported from Discogs). */
export interface Track {
	albumUid: string;
	/** Play order, 1-based. */
	index: number;
	/** Position as printed on the release, e.g. "A1", "2-03". */
	position: string | null;
	name: string;
	/** Duration as printed, e.g. "4:04". */
	duration: string | null;
	durationSec: number | null;
	/** Section heading the track belongs to, e.g. "Bonus Tracks". */
	heading: string | null;
	/** Spotify track id (22 base-62 characters), set by hand. */
	spotifyTrackId?: string | null;
	/** YouTube video id of the track, set by hand. */
	youtubeVideoId?: string | null;
	/** Songwriters added by hand, beyond the Discogs credits. */
	writers?: string[] | null;
	source?: string;
}

export type TrackEntity = Track & Entity;

/**
 * Lyrics of a track, kept apart from the public track document
 * (`track-lyrics/{trackUid}`): readable only when signed in.
 */
export interface TrackLyrics {
	text: string;
	/** Time-synced lyrics in LRC format (`[mm:ss.xx] line`), when known. */
	synced?: string | null;
}
