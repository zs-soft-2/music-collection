import { DOCUMENT, computed, inject } from '@angular/core';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';

import {
	SpotifyEmbedController,
	SpotifyEmbedEffect,
	SpotifyEmbedPlayback,
} from '../../data/spotify';

/**
 * `idle` before there is a frame, `unavailable` once Spotify's own script has
 * refused to come — the page then falls back to a plain frame nobody can
 * press, and the player has to keep its buttons to itself.
 */
type SpotifyEmbedStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

interface SpotifyEmbedState {
	/** The record the frame holds ("spotify:album:…"), or none. */
	uri: string | null;
	status: SpotifyEmbedStatus;
	paused: boolean;
	/** Position in what plays at `positionAt`. */
	positionMs: number;
	positionAt: number;
	durationMs: number;
	error: string | null;
}

const EMPTY: SpotifyEmbedState = {
	uri: null,
	status: 'idle',
	paused: true,
	positionMs: 0,
	positionAt: 0,
	durationMs: 0,
	error: null,
};

/**
 * Spotify's embedded frame, and this side's hold on it.
 *
 * One frame at a time, because one page shows one record. The frame is the
 * only Spotify a collector without their own app has, so the play button over
 * it presses this rather than doing nothing — but only this: the frame names
 * no track, skips to none and has no volume, and the player asks it for none
 * of that.
 */
export const SpotifyEmbedStore = signalStore(
	{ providedIn: 'root' },
	withState<SpotifyEmbedState>(EMPTY),
	withComputed((store) => ({
		/** There is a frame to press, or there will be in a moment. */
		controllable: computed(
			() => store.status() === 'loading' || store.status() === 'ready'
		),
		playing: computed(() => store.status() === 'ready' && !store.paused()),
	})),
	withMethods(
		(
			store,
			effect = inject(SpotifyEmbedEffect),
			document = inject(DOCUMENT)
		) => {
			let controller: SpotifyEmbedController | null = null;
			let creating: Promise<SpotifyEmbedController | null> | null = null;
			/**
			 * Which frame the answers coming back belong to. A page left
			 * while its frame was still being made must not be handed one
			 * afterwards, and the late answer has no other way of knowing.
			 */
			let generation = 0;

			const update = (playback: SpotifyEmbedPlayback) =>
				patchState(store, {
					paused: playback.isPaused,
					positionMs: playback.position,
					positionAt: Date.now(),
					durationMs: playback.duration,
				});

			const create = (
				element: HTMLElement,
				uri: string,
				heightPx: number
			): Promise<SpotifyEmbedController | null> => {
				const mine = generation;
				// The API replaces what it is given, so it is given a node of
				// our own inside the host: Angular keeps the host and never
				// meets the frame that takes this one's place.
				const target = document.createElement('div');
				element.appendChild(target);

				return effect
					.createFrame(target, uri, heightPx, {
						ready: () => {
							if (mine === generation) {
								patchState(store, { status: 'ready' });
							}
						},
						update: (playback) => {
							if (mine === generation) {
								update(playback);
							}
						},
						error: (error) => {
							if (mine === generation) {
								patchState(store, { error });
							}
						},
					})
					.then((made) => {
						if (mine !== generation) {
							made.destroy();

							return null;
						}
						controller = made;
						patchState(store, { status: 'ready' });
						// The page moved on while the frame was being made.
						const wanted = store.uri();
						if (wanted && wanted !== uri) {
							made.loadUri(wanted);
						}

						return made;
					})
					.catch((error: unknown) => {
						console.error('The Spotify frame was not made', error);
						if (mine === generation) {
							patchState(store, { status: 'unavailable' });
						}

						return null;
					});
			};

			return {
				/**
				 * Shows the record in the frame inside `host`, making the
				 * frame the first time and putting the record in the one
				 * already there afterwards.
				 */
				show(host: HTMLElement, uri: string, heightPx: number): void {
					if (store.uri() === uri && (controller || creating)) {
						return;
					}
					patchState(store, {
						uri,
						paused: true,
						positionMs: 0,
						positionAt: Date.now(),
						durationMs: 0,
						error: null,
					});
					if (controller) {
						controller.loadUri(uri);

						return;
					}
					if (creating || store.status() === 'unavailable') {
						return;
					}
					patchState(store, { status: 'loading' });
					creating = create(host, uri, heightPx);
				},

				/** The page showing the frame is gone; so is the frame. */
				detach(): void {
					generation += 1;
					controller?.destroy();
					controller = null;
					creating = null;
					patchState(store, EMPTY);
				},

				/** Starts the record, unless it plays already. */
				async play(): Promise<void> {
					const frame = controller ?? (await creating);

					if (frame && store.paused()) {
						frame.togglePlay();
					}
				},

				async togglePlay(): Promise<void> {
					const frame = controller ?? (await creating);

					frame?.togglePlay();
				},

				async pause(): Promise<void> {
					const frame = controller ?? (await creating);

					if (frame && !store.paused()) {
						frame.togglePlay();
					}
				},
			};
		}
	)
);
