import { Entity } from '../../../common';
import { DocumentEntity } from '../../document';
import { TrackClip } from './track-media';

/**
 * A picture put on a track: a still from the video, a photograph of the band
 * the night it was recorded, or one a model drew from the song.
 *
 * It is a document over a file, like every other picture in the catalog —
 * the album's cover is the same shape. The document is what makes the file
 * findable again: it carries the name, the category and the address, and the
 * document library lists it. A file sitting in the bucket with nothing over
 * it is a file nobody will ever find.
 */
export type TrackDocument = Omit<DocumentEntity, 'originalName' | 'fileType'>;

export interface TrackImage extends TrackDocument {
	/** Size of the stored picture, so the page keeps the box before it loads. */
	width?: number | null;
	height?: number | null;
	/** True when a model drew it rather than somebody uploading one. */
	generated?: boolean;
}

/** One track of an album, in play order (imported from Discogs). */
export interface Track {
	albumUid: string;
	/**
	 * Set when the track is only on one pressing — a bonus cut, a different
	 * edit, a side the reissue added. Missing means the track is the album's
	 * own, and every copy of it plays the track.
	 */
	releaseUid?: string | null;
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
	/**
	 * Pictures of the song, in the order they are shown: the track page's
	 * header runs through them, and the player's stage can play them behind
	 * the words while the song is on.
	 */
	images?: TrackImage[] | null;
	/**
	 * The short moving clip written from the song's lyrics, once somebody
	 * has had one generated — a document over a file like the pictures, in
	 * its own category. The player prefers it to the slideshow; without it
	 * the pictures simply take their turns.
	 */
	clip?: TrackClip | null;
	source?: string;
}

export type TrackEntity = Track & Entity;

/**
 * A track one pressing added, as the release form writes it: a Japanese
 * edition with a tenth song the original nine never had.
 *
 * It is a track of the album like any other — same collection, same shape,
 * creditable and playable — with the pressing named on it, so only a copy of
 * that pressing lists it.
 */
export interface ReleaseTrackDraft {
	/** Empty for a new track; the existing one's id when it is edited. */
	uid: string | null;
	albumUid: string;
	releaseUid: string;
	/** Play order, 1-based; after the album's own tracks. */
	index: number;
	position: string | null;
	name: string;
	duration: string | null;
}

/**
 * An album's own track as the album form writes it by hand: a title the
 * import spelled wrong, a length nobody filled in, a position that reads
 * "A1" on the sleeve and "1" in the data.
 *
 * Only what is printed on the record is here. The links, the writers and the
 * lyrics belong to the track page, which is where they are edited.
 */
export interface AlbumTrackDraft {
	uid: string;
	/** Play order, 1-based. */
	index: number;
	position: string | null;
	name: string;
	duration: string | null;
}

/**
 * A track typed into the album form by hand, for a record no import lists:
 * a private pressing, a tape, a single MusicBrainz never heard of.
 *
 * It carries no id and no play order — the album hands both out when the
 * track is written, so that a new song lands after the ones already there
 * and never on top of an id another song still holds.
 */
export interface AlbumTrackAdd {
	albumUid: string;
	position: string | null;
	name: string;
	duration: string | null;
}

/**
 * Lyrics of a track, kept apart from the public track document
 * (`track-lyrics/{trackUid}`): readable only when signed in.
 */
export interface TrackLyrics {
	text: string;
	/** Time-synced lyrics in LRC format (`[mm:ss.xx] line`), when known. */
	synced?: string | null;
}
