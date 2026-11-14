import {
	type AlbumEntity,
	isSpotifyAlbumId,
	isYoutubePlaylistId,
	isYoutubeVideoId,
} from '@music-collection/api';
import { toAlbumCoverUrl } from '@music-collection/common/engine';

import type { PlayerSource, PlayerSourceSetting } from '../../data/player';

import type { NowPlaying, QueuedRecord } from './player-request';

/** Which sources a record could be played on at all. */
export interface AvailableSources {
	spotify: boolean;
	youtube: boolean;
}

/**
 * The source the setting picks out of those a record has, and null where it
 * has none. A source the setting names but the record lacks gives way to the
 * other one.
 *
 * `spotifyConnected` is asked only where the answer depends on it, so a
 * computed reading this does not follow the sign-in when it need not.
 */
export function chooseSource(
	setting: PlayerSourceSetting,
	{ spotify: onSpotify, youtube: onYoutube }: AvailableSources,
	spotifyConnected: () => boolean
): PlayerSource | null {
	switch (setting) {
		case 'spotify':
			return onSpotify ? 'spotify' : onYoutube ? 'youtube' : null;
		case 'youtube':
			return onYoutube ? 'youtube' : onSpotify ? 'spotify' : null;
		default:
			// Spotify when signed in to it, else YouTube, else Spotify (it
			// offers the sign-in).
			return onSpotify && spotifyConnected()
				? 'spotify'
				: onYoutube
					? 'youtube'
					: onSpotify
						? 'spotify'
						: null;
	}
}

/** What plays now: the session's source first, then whichever plays. */
export function pickNow(
	sessionSource: PlayerSource | null,
	onSpotify: NowPlaying | null,
	onYoutube: NowPlaying | null
): NowPlaying | null {
	if (sessionSource === 'youtube') {
		return onYoutube ?? onSpotify;
	}
	if (sessionSource === 'spotify') {
		return onSpotify ?? onYoutube;
	}
	return onYoutube?.playing ? onYoutube : (onSpotify ?? onYoutube);
}

/** The albums a card can start, by the source it would start them on. */
export interface PlayableSources {
	spotify: Set<string>;
	youtube: Set<string>;
}

/**
 * The albums a card can start, by source. A Spotify album counts only with
 * the collector's own app; a YouTube one by its playlist or its videos, and
 * only while YouTube's player can be driven at all.
 */
export function playableSourcesOf(
	albums: readonly AlbumEntity[],
	{ ownApp, canDriveYoutube }: { ownApp: boolean; canDriveYoutube: boolean }
): PlayableSources {
	const spotifyAlbums = new Set<string>();
	const youtubeAlbums = new Set<string>();

	for (const album of albums) {
		if (ownApp && isSpotifyAlbumId(album.spotifyAlbumId)) {
			spotifyAlbums.add(album.uid);
		}
		if (
			canDriveYoutube &&
			(isYoutubePlaylistId(album.youtubePlaylistId) ||
				(album.youtubeVideoIds ?? []).some(isYoutubeVideoId))
		) {
			youtubeAlbums.add(album.uid);
		}
	}

	return { spotify: spotifyAlbums, youtube: youtubeAlbums };
}

/**
 * The records of the queue as the catalog names them, in queue order. A
 * record the catalog cannot name is left out rather than standing in the
 * list as a blank.
 */
export function queuedRecordsOf(
	queue: readonly string[],
	albums: readonly AlbumEntity[]
): QueuedRecord[] {
	const named = new Map(albums.map((album) => [album.uid, album]));

	return queue.flatMap((albumId) => {
		const album = named.get(albumId);

		return album
			? [
					{
						albumId,
						albumTitle: album.name,
						artistName: album.artist?.name ?? null,
						coverUrl: toAlbumCoverUrl(album),
					},
				]
			: [];
	});
}

/** Where a player reported to be, as it last said so. */
export interface ReportedPosition {
	playing: boolean;
	positionMs: number;
	/** When it said so. */
	positionAt: number;
	/** 0 where the length is not known. */
	durationMs: number;
}

/**
 * Where a player is now: it reports its place now and then, and while it
 * plays the time since is counted on top, kept within the record's length.
 */
export function runningPositionMs(
	{ playing, positionMs, positionAt, durationMs }: ReportedPosition,
	now: number
): number {
	const position = playing ? positionMs + (now - positionAt) : positionMs;

	return Math.min(Math.max(0, position), durationMs || position);
}
