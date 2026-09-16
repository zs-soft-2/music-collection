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
}

/** A track of our album, to be matched to its Spotify track. */
export interface TrackToMatch {
	id: string;
	name: string;
	/** Play order, 1-based. */
	index: number;
}

export class SpotifyNotConnectedError extends Error {
	public constructor() {
		super('Not connected to Spotify.');
	}
}
