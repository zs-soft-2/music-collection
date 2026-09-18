import { Injectable, inject } from '@angular/core';

import { YoutubeIframeRepository } from './youtube-iframe.repository';
import { YT_PLAYING, YtPlayer } from './youtube-iframe.types';

/** What the player reports on every state change. */
export interface YoutubePlayerState {
	/** Playlist position (0-based), -1 for a single video. */
	playlistIndex: number;
	playing: boolean;
	positionMs: number;
	durationMs: number;
}

export interface YoutubePlayerEvents {
	/** With the player's volume, 0–100. */
	ready: (volumePercent: number) => void;
	stateChanged: (state: YoutubePlayerState) => void;
}

/** Controls an embedded YouTube player: playlist position and track changes. */
@Injectable({ providedIn: 'root' })
export class YoutubePlaybackEffect {
	private readonly repository = inject(YoutubeIframeRepository);

	public attach(
		iframe: HTMLIFrameElement,
		events: YoutubePlayerEvents
	): Promise<YtPlayer> {
		return this.repository.attach(iframe, {
			events: {
				onReady: ({ target }) => events.ready(target.getVolume()),
				onStateChange: ({ target, data }) =>
					events.stateChanged({
						playlistIndex: target.getPlaylistIndex(),
						playing: data === YT_PLAYING,
						positionMs: target.getCurrentTime() * 1000,
						durationMs: target.getDuration() * 1000,
					}),
			},
		});
	}

	public playAt(player: YtPlayer, index: number): void {
		player.playVideoAt(index);
	}

	public setPlaying(player: YtPlayer, playing: boolean): void {
		if (playing) {
			player.playVideo();
		} else {
			player.pauseVideo();
		}
	}

	public setVolume(player: YtPlayer, volumePercent: number): void {
		player.setVolume(volumePercent);
	}

	public seek(player: YtPlayer, positionMs: number): void {
		player.seekTo(positionMs / 1000, true);
	}

	public skip(player: YtPlayer, direction: 'previous' | 'next'): void {
		if (direction === 'next') {
			player.nextVideo();
		} else {
			player.previousVideo();
		}
	}
}
