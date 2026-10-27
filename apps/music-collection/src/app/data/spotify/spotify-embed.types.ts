/** The parts of the Spotify Embed IFrame API the app uses. */

/** Playback of the embedded frame, as its own updates report it. */
export interface SpotifyEmbedPlayback {
	isPaused: boolean;
	isBuffering: boolean;
	/** Milliseconds. */
	duration: number;
	/** Milliseconds into what is playing. */
	position: number;
	/**
	 * The Spotify track playing, which nothing here reads: naming it as one
	 * of ours would take the album's tracklist from Spotify, and asking for
	 * that is the very thing a collector without their own app cannot do.
	 */
	playingURI?: string;
}

/**
 * What the frame refuses to play, and why. `recoverable` says whether asking
 * again could go differently — a blocked start is, a record Spotify does not
 * have is not.
 */
export interface SpotifyEmbedFailure {
	/** "invalid_uri" or "playback_error". */
	code: string;
	message: string;
	recoverable: boolean;
}

/**
 * One embedded frame, controlled from this side. It plays whatever the
 * visitor's own Spotify allows — the full record while they are signed in to
 * Spotify in this browser, a taste of it otherwise — and asks nothing of us:
 * no app, no token, no account of ours.
 *
 * What it cannot do is as fixed as what it can: no track of its own to name,
 * no next or previous, no volume. Whoever drives it has to offer only this.
 */
export interface SpotifyEmbedController {
	/** Starts the record from its beginning. */
	play(): void;
	pause(): void;
	resume(): void;
	togglePlay(): void;
	/** Seconds, unlike everything the frame reports back. */
	seek(positionSeconds: number): void;
	/** Puts another record in the same frame, paused at its start. */
	loadUri(uri: string): void;
	/** Takes the frame off the page. */
	destroy(): void;
	addListener(event: 'ready', callback: () => void): void;
	addListener(
		event: 'playback_update',
		callback: (update: { data: SpotifyEmbedPlayback }) => void
	): void;
	addListener(
		event: 'error',
		callback: (failure: { data: SpotifyEmbedFailure }) => void
	): void;
}

export interface SpotifyEmbedOptions {
	/** "spotify:album:…" or "spotify:track:…". */
	uri: string;
	width: string | number;
	height: string | number;
	/** The frame in the page's own colours, as it was written in before. */
	theme?: 'dark';
}

export interface SpotifyEmbedApi {
	/**
	 * Replaces `element` with the frame. The element is given away by this
	 * call: whatever was there is gone, so it is never one Angular holds.
	 */
	createController(
		element: HTMLElement,
		options: SpotifyEmbedOptions,
		callback: (controller: SpotifyEmbedController) => void
	): void;
}

export interface SpotifyEmbedWindow extends Window {
	onSpotifyIframeApiReady?: (api: SpotifyEmbedApi) => void;
}
