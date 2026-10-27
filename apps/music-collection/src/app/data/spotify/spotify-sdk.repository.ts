import { DOCUMENT, Injectable, inject } from '@angular/core';

import { ExternalPlayerConsentService } from '../external-player';
import { SdkPlayer, SdkPlayerOptions, SdkWindow } from './spotify-sdk.types';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

/** Loads the Spotify Web Playback SDK once and creates players. */
@Injectable({ providedIn: 'root' })
export class SpotifySdkRepository {
	private readonly document = inject(DOCUMENT);
	private readonly consent = inject(ExternalPlayerConsentService);
	private loading: Promise<void> | null = null;

	public createPlayer(options: SdkPlayerOptions): Promise<SdkPlayer> {
		// Spotify's own script, fetched from Spotify: loading it is already the
		// visit reported. The buttons that lead here are hidden without leave,
		// so this is the floor rather than the door.
		if (!this.consent.allowed()) {
			return Promise.reject(
				new Error('The Spotify player needs your permission first.')
			);
		}

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
