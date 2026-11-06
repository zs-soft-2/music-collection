import {
	type AlbumEntity,
	type TrackEntity,
	isSpotifyAlbumId,
	isSpotifyTrackId,
	isYoutubePlaylistId,
	isYoutubeVideoId,
} from '@music-collection/api';
import { toAlbumCoverUrl } from '@music-collection/common/engine';

import type { PlayerContext, PlayerSource } from '../../data/player';
import type { TrackToMatch } from '../../data/spotify';
import type {
	YoutubeAlbum,
	YoutubeItem,
} from '../youtube/youtube-playback.store';

/** An album, or one of its tracks, to play. */
export interface PlayRequest {
	context: PlayerContext;
	/** Our album id. */
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	/**
	 * Our own id of that artist, where the record names one. Nothing in the
	 * playing uses it; it is carried so that a verdict given after the record
	 * can say whose record it was — a name is read, a uid is matched.
	 */
	artistId: string | null;
	coverUrl: string | null;
	/**
	 * The album's styles, as the taxonomy spells them. The animated backdrop
	 * reads them to pick which world to build: without them it had to draw a
	 * world out of the band's name, so the look was different per record but
	 * never actually about the music.
	 */
	styles: string[];
	spotifyAlbumId: string | null;
	youtubePlaylistId: string | null;
	/** The album's tracks in play order. */
	tracks: TrackToMatch[];
	/** Our id of the track in focus; null for the whole album. */
	trackId: string | null;
	trackName: string | null;
	/** YouTube video of the track in focus. */
	youtubeVideoId: string | null;
	/** Spotify track in focus, for the preview player when not signed in. */
	spotifyTrackId: string | null;
	/** The album's other YouTube videos. */
	youtubeVideoIds: string[];
}

/** What plays now, whichever source it is on. */
export interface NowPlaying {
	source: PlayerSource;
	title: string;
	subtitle: string;
	coverUrl: string | null;
	playing: boolean;
	/** Our album and track, when what plays is one of ours. */
	albumId: string | null;
	trackId: string | null;
}

/** A record heard right through, as the question about it names it. */
export interface FinishedRecord {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	/** Our own artist id, where the record being played carries one. */
	artistId: string | null;
}

/** A record waiting in the queue, as a list of what is coming shows it. */
export interface QueuedRecord {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	coverUrl: string | null;
}

/** Playback held at the start of a side, waiting to be let on. */
export interface SideBreak {
	/** The track the side starts with. */
	trackId: string;
	/** "Side B", as the prompt names it. */
	label: string;
}

/** A track of the catalog as the player holds it. */
export const toTrackToMatch = ({
	uid,
	name,
	index,
	position,
	images,
	clip,
}: TrackEntity): TrackToMatch => ({
	id: uid,
	name,
	index,
	position,
	images: images ?? [],
	clip: clip ?? null,
});

/** An album of the catalog as something to play. */
export function albumPlayRequest(
	album: AlbumEntity,
	tracks: TrackEntity[],
	context: PlayerContext = 'album'
): PlayRequest {
	return {
		context,
		albumId: album.uid,
		albumTitle: album.name,
		artistName: album.artist?.name ?? null,
		artistId: album.artist?.uid ?? null,
		coverUrl: toAlbumCoverUrl(album),
		styles: album.styles ?? [],
		spotifyAlbumId: isSpotifyAlbumId(album.spotifyAlbumId)
			? album.spotifyAlbumId
			: null,
		youtubePlaylistId: isYoutubePlaylistId(album.youtubePlaylistId)
			? album.youtubePlaylistId
			: null,
		tracks: tracks.map(toTrackToMatch),
		trackId: null,
		trackName: null,
		youtubeVideoId: null,
		spotifyTrackId: null,
		youtubeVideoIds: (album.youtubeVideoIds ?? []).filter(isYoutubeVideoId),
	};
}

/** What Spotify has of a request: the record, or the song alone. */
export type SpotifyPlayable =
	{ kind: 'album'; id: string } | { kind: 'track'; id: string };

/**
 * What Spotify would play for this request, and null where it has nothing.
 *
 * The record comes first: played from it, a song has what follows it. But
 * most of the catalog was seeded from elsewhere, so Spotify can be missing
 * the record while having the song on it — and then the song on its own is
 * still better than a play button that does nothing.
 */
export function onSpotify(
	request: PlayRequest | null | undefined
): SpotifyPlayable | null {
	const albumId = request?.spotifyAlbumId;
	const trackId = request?.spotifyTrackId;

	if (albumId) {
		return { kind: 'album', id: albumId };
	}

	return isSpotifyTrackId(trackId) ? { kind: 'track', id: trackId } : null;
}

/** A record being listened to, and what is playing it. */
export interface Listening {
	/** The record, as whoever put it on asked for it. */
	request: PlayRequest;
	source: PlayerSource;
	playing: boolean;
	/** Our track, where the source can name one. */
	trackId: string | null;
}

/**
 * The record being listened to, whoever is playing it: the one this player
 * put on, or the one the page's Spotify frame plays.
 *
 * The frame is a listening like any other — it is how a collector without
 * their own Spotify app hears everything — so the log follows it too. What
 * the frame cannot say is which track is on, so a sitting with it names none
 * and therefore never finishes a record. Nor does it need to leave out the
 * thirty-second tastes the frame plays for a visitor not signed in to
 * Spotify: they are over before a sitting is long enough to be written.
 */
export function listeningTo(
	now: NowPlaying | null,
	session: PlayRequest | null,
	page: PlayRequest | null,
	frame: { drives: boolean; playing: boolean }
): Listening | null {
	if (now && session && now.albumId && session.albumId === now.albumId) {
		return {
			request: session,
			source: now.source,
			playing: now.playing,
			trackId: now.trackId,
		};
	}

	return page && frame.drives
		? {
				request: page,
				source: 'spotify',
				playing: frame.playing,
				trackId: null,
			}
		: null;
}

/**
 * A request as an album of the YouTube player: the track's video first, then
 * the album playlist and the other videos.
 */
export function youtubeAlbumOf(request: PlayRequest): YoutubeAlbum {
	const items: YoutubeItem[] = [];
	if (request.youtubeVideoId) {
		items.push({ kind: 'video', id: request.youtubeVideoId });
	}
	if (request.youtubePlaylistId) {
		items.push({ kind: 'playlist', id: request.youtubePlaylistId });
	}
	for (const id of request.youtubeVideoIds) {
		if (id !== request.youtubeVideoId) {
			items.push({ kind: 'video', id });
		}
	}
	return {
		uid: request.albumId,
		title: request.albumTitle,
		artistName: request.artistName ?? '',
		coverUrl: request.coverUrl,
		items,
		trackNames: request.tracks.map((track) => track.name),
	};
}
