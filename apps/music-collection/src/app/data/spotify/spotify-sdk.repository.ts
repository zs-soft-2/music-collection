import { DOCUMENT, Injectable, inject } from '@angular/core';

import { SdkPlayer, SdkPlayerOptions, SdkWindow } from './spotify-sdk.types';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

/** Loads the Spotify Web Playback SDK once and creates players. */
@Injectable({ providedIn: 'root' })
export class SpotifySdkRepository {
	private readonly document = inject(DOCUMENT);
	private loading: Promise<void> | null = null;

	public createPlayer(options: SdkPlayerOptions): Promise<SdkPlayer> {
		return this.load().then(() => {
			const Player = this.window.Spotify?.Player;
			if (!Player) {
				throw new Error('The Spotify player could not be loaded.');
			}
			return new Player(options);
		});
	}

	private get window(): SdkWindow {
		return this.document.defaultView as SdkWindow;
	}

	private load(): Promise<void> {
		if (this.window.Spotify) {
			return Promise.resolve();
		}
		this.loading ??= new Promise<void>((resolve, reject) => {
			this.window.onSpotifyWebPlaybackSDKReady = () => resolve();

			const script = this.document.createElement('script');
			script.src = SDK_URL;
			script.async = true;
			script.onerror = () => {
				this.loading = null;
				reject(new Error('The Spotify player could not be loaded.'));
			};
			this.document.body.appendChild(script);
		});

		return this.loading;
	}
}
