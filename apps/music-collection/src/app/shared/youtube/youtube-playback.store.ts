import { computed, inject, signal } from '@angular/core';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withProps,
	withState,
} from '@ngrx/signals';

import { YoutubePlaybackEffect, YtPlayer } from '../../data/youtube';

export type YoutubeItem =
	{ kind: 'playlist'; id: string } | { kind: 'video'; id: string };

/** An album with something on YouTube, as the album page hands it over. */
export interface YoutubeAlbum {
	uid: string;
	title: string;
	artistName: string;
	coverUrl: string | null;
	/** The album playlist first, then the videos. */
	items: YoutubeItem[];
	/** Track names in album order, for the playlist position playing. */
	trackNames: string[];
}

interface YoutubePlaybackState {
	/** The album in the player; null when the player is closed. */
	album: YoutubeAlbum | null;
	/** What the player shows. */
	selection: YoutubeItem | null;
	/** Start playing on load: only after the visitor asked for it. */
	autoplay: boolean;
	/** Playlist position to start the playlist at. */
	startIndex: number;
	/** Playlist position playing now (0-based), null outside a playlist. */
	playlistIndex: number | null;
	playing: boolean;
	/** Something has played since the album was loaded. */
	started: boolean;
	/**
	 * What was loaded ran out on its own. On a playlist that is the end of
	 * the album; on a single video, the end of that video.
	 */
	ended: boolean;
	/** Position in the item at `positionAt`. */
	positionMs: number;
	durationMs: number;
	/** Epoch milliseconds `positionMs` was measured at. */
	positionAt: number;
	/** 0–100; kept when the player is reloaded. */
	volume: number;
	/**
	 * The frame can be taken over from here. False once YouTube's own script
	 * has not come — an extension blocking it is the usual reason — and then
	 * the frame plays by its own buttons alone.
	 */
	controllable: boolean;
	/** What stopped this side from driving the frame, for the page to say. */
	error: string | null;
}

const initialState: YoutubePlaybackState = {
	album: null,
	selection: null,
	autoplay: false,
	startIndex: 0,
	playlistIndex: null,
	playing: false,
	started: false,
	ended: false,
	positionMs: 0,
	durationMs: 0,
	positionAt: 0,
	volume: 100,
	controllable: true,
	error: null,
};

const sameItem = (a: YoutubeItem | null, b: YoutubeItem | null) =>
	!!a && !!b && a.kind === b.kind && a.id === b.id;

/**
 * YouTube playback for the whole app: one embedded player (rendered by the
 * dock) that keeps playing across pages, shown in the album page's slot or
 * floating, and controlled from the album page and the app bar.
 */
export const YoutubePlaybackStore = signalStore(
	{ providedIn: 'root' },
	withState<YoutubePlaybackState>(initialState),
	withProps(() => ({
		/**
		 * The album page's place for the player. A plain signal: an element
		 * must not go into the (frozen) store state.
		 */
		slot: signal<{ albumUid: string; element: HTMLElement } | null>(null),
	})),
	withComputed((store) => ({
		/** Name of what plays: the track of the playlist or the video. */
		nowPlayingTitle: computed(() => {
			const album = store.album();
			const selection = store.selection();
			if (!album || !selection) {
				return null;
			}
			if (selection.kind === 'video') {
				const videos = album.items.filter(
					(item) => item.kind === 'video'
				);
				const number =
					videos.findIndex((item) => item.id === selection.id) + 1;
				return `Video ${number}`;
			}
			const index = store.playlistIndex();
			return index !== null ? (album.trackNames[index] ?? null) : null;
		}),
		/** The player sits in the album page's slot, not floating. */
		inSlot: computed(
			() =>
				!!store.album() && store.slot()?.albumUid === store.album()?.uid
		),
	})),
	withMethods((store, effect = inject(YoutubePlaybackEffect)) => {
		let player: YtPlayer | null = null;
		let ready = false;
		/**
		 * What a reset keeps: this browser's own settings, and what it has
		 * learnt about the frame. A blocked script is blocked for the next
		 * record too, and the buttons would flicker back for nothing.
		 */
		const kept = () => ({
			volume: store.volume(),
			controllable: store.controllable(),
			error: store.error(),
		});
		/** Increases with every attach, so a late one does not win. */
		let generation = 0;

		const detach = () => {
			generation++;
			player?.destroy();
			player = null;
			ready = false;
		};

		const control = (action: (player: YtPlayer) => void) => {
			if (player && ready) {
				action(player);
			}
		};

		return {
			/**
			 * The album page shows an album. It takes the player unless another
			 * album has been played; then that one keeps playing.
			 */
			open(album: YoutubeAlbum): void {
				const current = store.album();
				if (current?.uid === album.uid) {
					// Same album, maybe refreshed links or tracks.
					const selection = album.items.some((item) =>
						sameItem(item, store.selection())
					)
						? store.selection()
						: (album.items[0] ?? null);
					patchState(store, { album, selection });
					return;
				}
				if (current && store.started()) {
					return;
				}
				detach();
				patchState(store, {
					...initialState,
					...kept(),
					album,
					selection: album.items[0] ?? null,
				});
			},

			/** Replaces the playing album with this one, starting its first item. */
			switchTo(album: YoutubeAlbum): void {
				detach();
				patchState(store, {
					...initialState,
					...kept(),
					album,
					selection: album.items[0] ?? null,
					autoplay: true,
				});
			},

			/** Stops playback and closes the player. */
			close(): void {
				detach();
				patchState(store, { ...initialState, ...kept() });
			},

			/** Takes control of the player frame showing the current item. */
			attach(iframe: HTMLIFrameElement): void {
				detach();
				const current = generation;
				patchState(store, {
					playlistIndex: null,
					playing: false,
					ended: false,
				});

				effect
					.attach(iframe, {
						ready: () => {
							if (current === generation) {
								ready = true;
								// A new frame starts at full volume: keep the chosen one.
								queueMicrotask(() =>
									control((p) =>
										effect.setVolume(p, store.volume())
									)
								);
							}
						},
						stateChanged: ({
							playlistIndex,
							playing,
							ended,
							positionMs,
							durationMs,
						}) => {
							if (current === generation) {
								patchState(store, {
									playlistIndex:
										playlistIndex >= 0
											? playlistIndex
											: null,
									playing,
									started: store.started() || playing,
									ended,
									positionMs,
									durationMs,
									positionAt: Date.now(),
								});
							}
						},
					})
					.then((created) => {
						if (current !== generation) {
							created.destroy();

							return;
						}
						player = created;
						patchState(store, {
							controllable: true,
							error: null,
						});
					})
					.catch((error) => {
						console.error(error);
						if (current === generation) {
							// The frame is still there and still plays by its
							// own buttons; what is gone is this side's hold
							// on it, and every button that stood for it.
							patchState(store, {
								controllable: false,
								error: 'YouTube could not be controlled from here — an extension is most likely blocking its player script. Its own buttons still work.',
							});
						}
					});
			},

			select(item: YoutubeItem): void {
				patchState(store, {
					selection: item,
					autoplay: true,
					startIndex: 0,
				});
			},

			/** Plays a track of the album playlist. */
			playTrack(index: number): void {
				const playlist = store
					.album()
					?.items.find((item) => item.kind === 'playlist');
				if (!playlist) {
					return;
				}
				if (sameItem(store.selection(), playlist) && player && ready) {
					effect.playAt(player, index);
				} else {
					// Reloads the frame at the track.
					patchState(store, {
						selection: playlist,
						autoplay: true,
						startIndex: index,
					});
				}
			},

			togglePlay(): void {
				control((p) => effect.setPlaying(p, !store.playing()));
			},

			/** 0–100. */
			setVolume(volumePercent: number): void {
				const volume = Math.round(
					Math.min(100, Math.max(0, volumePercent))
				);
				patchState(store, { volume });
				control((p) => effect.setVolume(p, volume));
			},

			/** Jumps to the position (milliseconds) in the item playing. */
			seek(positionMs: number): void {
				control((p) => {
					effect.seek(p, positionMs);
					patchState(store, { positionMs, positionAt: Date.now() });
				});
			},

			/**
			 * Plays the album's item from the start, at a playlist position
			 * when given. Replaces what is playing.
			 */
			playAlbum(
				album: YoutubeAlbum,
				item: YoutubeItem,
				startIndex = 0
			): void {
				detach();
				patchState(store, {
					...initialState,
					...kept(),
					album,
					selection: item,
					autoplay: true,
					startIndex,
				});
			},

			skip(direction: 'previous' | 'next'): void {
				control((p) => effect.skip(p, direction));
			},

			setSlot(albumUid: string, element: HTMLElement): void {
				store.slot.set({ albumUid, element });
			},

			/** Leaves the slot, unless another page took it already. */
			clearSlot(element: HTMLElement): void {
				if (store.slot()?.element === element) {
					store.slot.set(null);
				}
			},
		};
	}),
	withHooks({
		onDestroy: (store) => store.close(),
	})
);
