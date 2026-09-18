import { Injectable, inject } from '@angular/core';

import { YoutubeIframeRepository } from './youtube-iframe.repository';
import { YT_PLAYING, YtPlayer } from './youtube-iframe.types';

export interface YoutubePlayerEvents {
	ready: () => void;
	/** Playlist position (0-based, -1 for a single video) and whether it plays. */
	stateChanged: (playlistIndex: number, playing: boolean) => void;
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
				onReady: () => events.ready(),
				onStateChange: ({ target, data }) =>
					events.stateChanged(
						target.getPlaylistIndex(),
						data === YT_PLAYING
					),
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

	public skip(player: YtPlayer, direction: 'previous' | 'next'): void {
		if (direction === 'next') {
			player.nextVideo();
		} else {
			player.previousVideo();
		}
	}
}
