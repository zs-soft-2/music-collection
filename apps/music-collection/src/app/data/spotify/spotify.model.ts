export interface SpotifyToken {
	accessToken: string;
	refreshToken: string;
	/** Epoch milliseconds. */
	expiresAt: number;
}

/** A Spotify Connect device of the signed-in account. */
export interface SpotifyDevice {
	id: string;
	name: string;
	/** e.g. "Computer", "Speaker", "AVR", "Smartphone". */
	type: string;
	isActive: boolean;
	/** 0–100, when the device reports it. */
	volumePercent: number | null;
	supportsVolume: boolean;
}

export interface SpotifyAlbumTrack {
	uri: string;
	name: string;
	discNumber: number;
	trackNumber: number;
}

export interface SpotifyNowPlaying {
	trackUri: string;
	trackName: string;
	artists: string;
	albumUri: string;
	imageUrl: string | null;
	paused: boolean;
	/** Device the track plays on, when known. */
	deviceId: string | null;
	/** 0–100, when the device reports it. */
	volumePercent: number | null;
	/** Position in the track at `positionAt`. */
	positionMs: number;
	durationMs: number;
	/** Epoch milliseconds `positionMs` was measured at. */
	positionAt: number;
}

/** A track of our album, to be matched to its Spotify track. */
export interface TrackToMatch {
	id: string;
	name: string;
	/** Play order, 1-based. */
	index: number;
	/**
	 * Position as printed on the release, e.g. "A1". Nothing here matches on
	 * it; the player reads the record's sides off it.
	 */
	position?: string | null;
}

/** Where the track is now: measured position plus the time since, unless paused. */
export function currentPositionMs(
	nowPlaying: SpotifyNowPlaying,
	now = Date.now()
): number {
	const position = nowPlaying.paused
		? nowPlaying.positionMs
		: nowPlaying.positionMs + (now - nowPlaying.positionAt);

	return Math.min(Math.max(0, position), nowPlaying.durationMs || position);
}

export class SpotifyNotConnectedError extends Error {
	public constructor() {
		super('Not connected to Spotify.');
	}
}
