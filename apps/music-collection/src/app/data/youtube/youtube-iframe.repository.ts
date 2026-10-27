import { DOCUMENT, Injectable, inject } from '@angular/core';

import { YtPlayer, YtPlayerOptions, YtWindow } from './youtube-iframe.types';

const API_URL = 'https://www.youtube.com/iframe_api';

/** Loads the YouTube IFrame Player API once and controls embedded players. */
@Injectable({ providedIn: 'root' })
export class YoutubeIframeRepository {
	private readonly document = inject(DOCUMENT);
	private loading: Promise<void> | null = null;

	/** Takes control of an embedded player (its URL has enablejsapi=1). */
	public attach(
		iframe: HTMLIFrameElement,
		options: YtPlayerOptions
	): Promise<YtPlayer> {
		return this.load().then(() => {
			const Player = this.window.YT?.Player;
			if (!Player) {
				throw new Error('The YouTube player could not be loaded.');
			}
			return new Player(iframe, options);
		});
	}

	private get window(): YtWindow {
		return this.document.defaultView as YtWindow;
	}

	private load(): Promise<void> {
		if (this.window.YT?.Player) {
			return Promise.resolve();
		}
		this.loading ??= new Promise<void>((resolve, reject) => {
			this.window.onYouTubeIframeAPIReady = () => resolve();

			const script = this.document.createElement('script');
			script.src = API_URL;
			script.async = true;
			script.onerror = () => {
				this.loading = null;
				reject(new Error('The YouTube player could not be loaded.'));
			};
			this.document.body.appendChild(script);
		});

		return this.loading;
	}
}
