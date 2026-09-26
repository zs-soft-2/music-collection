import { DOCUMENT, Injectable, inject } from '@angular/core';

import { ExternalPlayerConsentService } from '../external-player';
import {
	SpotifyEmbedApi,
	SpotifyEmbedController,
	SpotifyEmbedOptions,
	SpotifyEmbedWindow,
} from './spotify-embed.types';

const API_URL = 'https://open.spotify.com/embed/iframe-api/v1';

/** Loads the Spotify Embed IFrame API once and creates frames with it. */
@Injectable({ providedIn: 'root' })
export class SpotifyEmbedRepository {
	private readonly document = inject(DOCUMENT);
	private readonly consent = inject(ExternalPlayerConsentService);
	private loading: Promise<SpotifyEmbedApi> | null = null;

	public createController(
		element: HTMLElement,
		options: SpotifyEmbedOptions
	): Promise<SpotifyEmbedController> {
		// Spotify's own script, fetched from Spotify: loading it is already
		// the visit reported. The frame itself is refused the same way, so
		// this only says again what the player above it has already decided.
		if (!this.consent.allowed()) {
			return Promise.reject(
				new Error('The Spotify player needs your permission first.')
			);
		}

		return this.load().then(
			(api) =>
				new Promise<SpotifyEmbedController>((resolve) =>
					api.createController(element, options, resolve)
				)
		);
	}

	private get window(): SpotifyEmbedWindow {
		return this.document.defaultView as SpotifyEmbedWindow;
	}

	private load(): Promise<SpotifyEmbedApi> {
		// The ready callback is called once, when the script arrives; a
		// second frame asked for later would never hear it, so the API it
		// handed over is what is kept, not the fact that it was loaded.
		this.loading ??= new Promise<SpotifyEmbedApi>((resolve, reject) => {
			this.window.onSpotifyIframeApiReady = resolve;

			const script = this.document.createElement('script');
			script.src = API_URL;
			script.async = true;
			script.onerror = () => {
				this.loading = null;
				reject(new Error('The Spotify frame could not be loaded.'));
			};
			this.document.body.appendChild(script);
		});

		return this.loading;
	}
}
