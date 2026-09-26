import { Injectable, inject } from '@angular/core';

import { SpotifyEmbedRepository } from './spotify-embed.repository';
import {
	SpotifyEmbedController,
	SpotifyEmbedPlayback,
} from './spotify-embed.types';

export interface SpotifyEmbedEvents {
	ready: () => void;
	update: (playback: SpotifyEmbedPlayback) => void;
	error: (message: string) => void;
}

/**
 * Spotify's embedded frame as something this player can press.
 *
 * It is the whole of Spotify for a collector who has not registered their own
 * app: the frame needs neither app nor token, and plays the record in full
 * for anyone signed in to Spotify in this browser. What it gives back is
 * play, pause and where it is — no track it could name, no next, no volume.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyEmbedEffect {
	private readonly repository = inject(SpotifyEmbedRepository);

	/**
	 * Puts the frame where `element` stands — the element is replaced, so it
	 * must be one nobody else holds — and listens to what it plays.
	 */
	public async createFrame(
		element: HTMLElement,
		uri: string,
		heightPx: number,
		events: SpotifyEmbedEvents
	): Promise<SpotifyEmbedController> {
		const controller = await this.repository.createController(element, {
			uri,
			width: '100%',
			height: heightPx,
			theme: 'dark',
		});

		controller.addListener('ready', () => events.ready());
		controller.addListener('playback_update', ({ data }) =>
			events.update(data)
		);
		// Browsers only let sound start from a tap, and a tap on our button
		// is not one inside somebody else's frame. Where Spotify will not
		// take ours for it, the frame's own play button is still there, so
		// what it refuses is said rather than swallowed.
		controller.addListener('error', ({ data }) =>
			events.error(data.message || 'Spotify would not play this.')
		);

		return controller;
	}
}
