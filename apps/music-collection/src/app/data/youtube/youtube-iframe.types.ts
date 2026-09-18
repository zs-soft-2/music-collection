/** The parts of the YouTube IFrame Player API this app uses. */
export interface YtPlayer {
	playVideoAt(index: number): void;
	playVideo(): void;
	pauseVideo(): void;
	nextVideo(): void;
	previousVideo(): void;
	getPlaylistIndex(): number;
	getPlayerState(): number;
	destroy(): void;
}

export interface YtPlayerEvent {
	target: YtPlayer;
	data: number;
}

export interface YtPlayerOptions {
	events?: {
		onReady?: (event: YtPlayerEvent) => void;
		onStateChange?: (event: YtPlayerEvent) => void;
	};
}

export type YtWindow = Window & {
	YT?: {
		Player: new (
			element: HTMLIFrameElement,
			options: YtPlayerOptions
		) => YtPlayer;
	};
	onYouTubeIframeAPIReady?: () => void;
};

/** YT.PlayerState.PLAYING */
export const YT_PLAYING = 1;
