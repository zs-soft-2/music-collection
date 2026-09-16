/** The parts of the Spotify Web Playback SDK the app uses. */

export interface SdkTrack {
	uri: string;
	name: string;
	artists: { name: string }[];
	album: { uri: string; name: string; images: { url: string }[] };
}

export interface SdkPlaybackState {
	paused: boolean;
	track_window: { current_track: SdkTrack };
}

export interface SdkPlayerOptions {
	name: string;
	getOAuthToken: (callback: (token: string) => void) => void;
	volume?: number;
}

export interface SdkPlayer {
	connect(): Promise<boolean>;
	disconnect(): void;
	activateElement(): Promise<void>;
	addListener(
		event: 'ready' | 'not_ready',
		callback: (payload: { device_id: string }) => void
	): boolean;
	addListener(
		event: 'player_state_changed',
		callback: (state: SdkPlaybackState | null) => void
	): boolean;
	addListener(
		event:
			| 'initialization_error'
			| 'authentication_error'
			| 'account_error'
			| 'playback_error',
		callback: (payload: { message: string }) => void
	): boolean;
}

export interface SdkWindow extends Window {
	onSpotifyWebPlaybackSDKReady?: () => void;
	Spotify?: { Player: new (options: SdkPlayerOptions) => SdkPlayer };
}
