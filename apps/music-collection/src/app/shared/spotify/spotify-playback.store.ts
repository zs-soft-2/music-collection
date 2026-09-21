import { DOCUMENT, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';

import {
	SdkPlayer,
	SpotifyApiError,
	SpotifyDevice,
	SpotifyNotConnectedError,
	SpotifyNowPlaying,
	SpotifyPlaybackEffect,
	TrackToMatch,
	currentPositionMs,
} from '../../data/spotify';

type SpotifyStatus = 'disconnected' | 'connecting' | 'ready';

interface SpotifyPlaybackState {
	configured: boolean;
	status: SpotifyStatus;
	/** This browser as a Spotify Connect device. */
	browserDeviceId: string | null;
	/** Chosen output device; null plays in this browser. */
	selectedDeviceId: string | null;
	devices: SpotifyDevice[];
	nowPlaying: SpotifyNowPlaying | null;
	/** Spotify album whose tracks `trackUris` maps. */
	tracksAlbumId: string | null;
	/** Our track id → Spotify track URI. */
	trackUris: Record<string, string>;
	/** Volume of the output device, 0–100. */
	volume: number;
	/** Volume the browser player starts at, kept for this browser, 0–100. */
	browserVolume: number;
	error: string | null;
}

/** Remote devices report no events, so their playback is polled. */
const REMOTE_POLL_MS = 4000;
/** Remote volume changes are sent once the slider rests this long. */
const VOLUME_DEBOUNCE_MS = 200;
/** Polled volume is ignored this long after a change, so the slider does not jump back. */
const VOLUME_SETTLE_MS = 2000;

const errorMessage = (error: unknown): string => {
	if (error instanceof SpotifyNotConnectedError) {
		return 'Sign in to Spotify again.';
	}
	if (error instanceof SpotifyApiError) {
		if (error.status === 404) {
			return 'The selected device is not available. Refresh the device list or pick another one.';
		}
		if (error.status === 403) {
			return 'Spotify refused the request. Full playback needs Spotify Premium.';
		}
	}
	return error instanceof Error ? error.message : String(error);
};

/**
 * Full Spotify playback: signs in, runs this browser as a player and plays
 * albums on it or on another Spotify Connect device (e.g. an amplifier).
 */
export const SpotifyPlaybackStore = signalStore(
	{ providedIn: 'root' },
	withState<SpotifyPlaybackState>({
		configured: false,
		status: 'disconnected',
		browserDeviceId: null,
		selectedDeviceId: null,
		devices: [],
		nowPlaying: null,
		tracksAlbumId: null,
		trackUris: {},
		volume: 80,
		browserVolume: 80,
		error: null,
	}),
	withComputed((store) => ({
		connected: computed(() => store.status() === 'ready'),
		outputDeviceId: computed(
			() => store.selectedDeviceId() ?? store.browserDeviceId()
		),
		/** Our id of the track playing now, when it belongs to the mapped album. */
		playingTrackId: computed(() => {
			const uri = store.nowPlaying()?.trackUri;
			return (
				Object.entries(store.trackUris()).find(
					([, trackUri]) => trackUri === uri
				)?.[0] ?? null
			);
		}),
		/**
		 * The device the sound comes out of, when that is not this browser.
		 * Playback can be moved from the Spotify app too, so what plays is
		 * not always what was picked here.
		 */
		remoteDeviceId: computed(() => {
			const selected = store.selectedDeviceId();
			if (selected) {
				return selected;
			}
			const playing = store.nowPlaying()?.deviceId ?? null;
			return playing && playing !== store.browserDeviceId()
				? playing
				: null;
		}),
		/** Other devices than this browser. */
		otherDevices: computed(() =>
			store
				.devices()
				.filter((device) => device.id !== store.browserDeviceId())
		),
	})),
	withComputed((store) => ({
		/** Whether the device playing lets its volume be changed. */
		volumeSupported: computed(() => {
			const remote = store.remoteDeviceId();
			if (!remote) {
				// This browser: only a player that exists has a volume.
				return !!store.browserDeviceId();
			}
			return (
				store.devices().find((device) => device.id === remote)
					?.supportsVolume ?? true
			);
		}),
	})),
	withMethods(
		(
			store,
			effect = inject(SpotifyPlaybackEffect),
			router = inject(Router),
			document = inject(DOCUMENT)
		) => {
			let player: SdkPlayer | null = null;
			let pollTimer: ReturnType<typeof setInterval> | null = null;
			let volumeTimer: ReturnType<typeof setTimeout> | null = null;
			let volumeChangedAt = 0;

			const fail = (error: unknown) => {
				console.error(error);
				if (error instanceof SpotifyNotConnectedError) {
					reset();
				}
				patchState(store, { error: errorMessage(error) });
			};

			const reset = () => {
				player?.disconnect();
				player = null;
				stopPolling();
				patchState(store, {
					status: 'disconnected',
					browserDeviceId: null,
					selectedDeviceId: null,
					devices: [],
					nowPlaying: null,
				});
			};

			const refreshNowPlaying = async () => {
				if (document.visibilityState === 'hidden') {
					return;
				}
				try {
					const nowPlaying = await effect.nowPlaying();
					patchState(store, { nowPlaying });
					if (
						nowPlaying?.volumePercent != null &&
						Date.now() - volumeChangedAt > VOLUME_SETTLE_MS
					) {
						patchState(store, { volume: nowPlaying.volumePercent });
					}
				} catch (error) {
					fail(error);
				}
			};

			const stopPolling = () => {
				if (pollTimer) {
					clearInterval(pollTimer);
					pollTimer = null;
				}
			};

			// The SDK reports its own player; everything else has to be asked
			// for. A browser that never became a device (iOS) is never the
			// output, so what plays there has to be polled as well.
			const pollWhenRemote = () => {
				stopPolling();
				if (store.selectedDeviceId() || !store.browserDeviceId()) {
					pollTimer = setInterval(refreshNowPlaying, REMOTE_POLL_MS);
					void refreshNowPlaying();
				}
			};

			const refreshDevices = async () => {
				try {
					const devices = await effect.devices();
					const selected = store.selectedDeviceId();
					patchState(store, {
						devices,
						error: null,
						selectedDeviceId: devices.some((d) => d.id === selected)
							? selected
							: null,
					});
				} catch (error) {
					fail(error);
				}
			};

			/** Starts the browser player when signed in before. */
			const start = async () => {
				if (!store.configured() || !effect.hasToken || player) {
					return;
				}
				patchState(store, { status: 'connecting', error: null });
				try {
					player = await effect.startBrowserPlayer({
						ready: (browserDeviceId) => {
							patchState(store, {
								browserDeviceId,
								status: 'ready',
							});
							pollWhenRemote();
							void refreshDevices();
						},
						notReady: () => {
							patchState(store, { browserDeviceId: null });
							pollWhenRemote();
						},
						stateChanged: (nowPlaying) => {
							if (!store.selectedDeviceId()) {
								patchState(store, { nowPlaying });
							}
						},
						error: (message) =>
							patchState(store, { error: message }),
					});
				} catch (error) {
					reset();
					fail(error);
				}
			};

			/** Shows the volume of the device just selected. */
			const syncVolume = async (deviceId: string | null) => {
				if (deviceId) {
					const volume = store
						.devices()
						.find(
							(device) => device.id === deviceId
						)?.volumePercent;
					if (volume != null) {
						patchState(store, { volume });
					}
				} else if (player) {
					patchState(store, {
						volume: Math.round((await player.getVolume()) * 100),
					});
				}
			};

			return {
				start,
				refreshDevices,

				/**
				 * Unlocks the player's audio element. Safari only lets sound
				 * start from the tap itself, so this has to run before the
				 * click's first `await`, not where playback finally begins.
				 */
				activate(): void {
					void player?.activateElement();
				},

				/** Leaves for the Spotify sign-in, then returns to this page. */
				async connect(): Promise<void> {
					try {
						await effect.beginLogin(router.url);
					} catch (error) {
						fail(error);
					}
				},

				/** Handles the sign-in callback; returns the page to go back to. */
				async completeLogin(
					code: string,
					state: string
				): Promise<string> {
					const returnUrl = await effect.completeLogin(code, state);
					await start();
					return returnUrl;
				},

				disconnect(): void {
					effect.signOut();
					reset();
					patchState(store, { error: null });
				},

				dismissError(): void {
					patchState(store, { error: null });
				},

				/** Maps the album's tracks to Spotify tracks (once per album). */
				async loadAlbumTracks(
					albumId: string,
					tracks: TrackToMatch[]
				): Promise<void> {
					if (store.tracksAlbumId() === albumId || !tracks.length) {
						return;
					}
					patchState(store, {
						tracksAlbumId: albumId,
						trackUris: {},
					});
					try {
						const trackUris = await effect.matchAlbumTracks(
							albumId,
							tracks
						);
						if (store.tracksAlbumId() === albumId) {
							patchState(store, { trackUris });
						}
					} catch (error) {
						patchState(store, { tracksAlbumId: null });
						fail(error);
					}
				},

				/**
				 * Plays the album, from one of its tracks when given; with
				 * `single`, only that track.
				 */
				async play(
					albumId: string,
					trackId: string | null,
					single = false
				): Promise<void> {
					// Browsers only allow audio started from the click itself.
					void player?.activateElement();

					const deviceId = store.outputDeviceId();
					if (!deviceId) {
						patchState(store, {
							error: 'The Spotify player is not ready yet.',
						});
						return;
					}
					const trackUri =
						trackId && store.tracksAlbumId() === albumId
							? (store.trackUris()[trackId] ?? null)
							: null;
					if (trackId && !trackUri) {
						patchState(store, {
							error: 'This track was not found in the Spotify version of the album.',
						});
						return;
					}
					try {
						await effect.play(deviceId, albumId, trackUri, single);
						patchState(store, { error: null });
						if (store.selectedDeviceId()) {
							setTimeout(refreshNowPlaying, 800);
						}
					} catch (error) {
						fail(error);
					}
				},

				async togglePlay(): Promise<void> {
					void player?.activateElement();
					const nowPlaying = store.nowPlaying();
					if (!nowPlaying) {
						return;
					}
					try {
						await effect.setPaused(!nowPlaying.paused);
						const now = Date.now();
						patchState(store, {
							nowPlaying: {
								...nowPlaying,
								paused: !nowPlaying.paused,
								positionMs: currentPositionMs(nowPlaying, now),
								positionAt: now,
							},
						});
					} catch (error) {
						fail(error);
					}
				},

				/** Jumps to the position (milliseconds) in the track playing. */
				async seek(positionMs: number): Promise<void> {
					const nowPlaying = store.nowPlaying();
					if (!nowPlaying) {
						return;
					}
					patchState(store, {
						nowPlaying: {
							...nowPlaying,
							positionMs,
							positionAt: Date.now(),
						},
					});
					try {
						await effect.seek(positionMs);
					} catch (error) {
						fail(error);
					}
				},

				async skip(direction: 'next' | 'previous'): Promise<void> {
					try {
						await effect.skip(direction);
						if (store.selectedDeviceId()) {
							setTimeout(refreshNowPlaying, 800);
						}
					} catch (error) {
						fail(error);
					}
				},

				/** Sets the volume (0–100) of the output device. */
				setVolume(volumePercent: number): void {
					const volume = Math.round(
						Math.min(100, Math.max(0, volumePercent))
					);
					patchState(store, { volume });
					volumeChangedAt = Date.now();

					if (volumeTimer) {
						clearTimeout(volumeTimer);
						volumeTimer = null;
					}
					const deviceId = store.remoteDeviceId();
					if (!deviceId) {
						patchState(store, { browserVolume: volume });
						effect.saveBrowserVolume(volume);
						player?.setVolume(volume / 100).catch(fail);
						return;
					}
					volumeTimer = setTimeout(async () => {
						volumeTimer = null;
						try {
							await effect.setVolume(deviceId, volume);
						} catch (error) {
							fail(error);
						}
					}, VOLUME_DEBOUNCE_MS);
				},

				/**
				 * The volume the browser player starts at. Unlike `setVolume`
				 * it never reaches a remote device: this is the setting of
				 * this browser, not the volume of what is playing elsewhere.
				 */
				setBrowserVolume(volumePercent: number): void {
					const volume = Math.round(
						Math.min(100, Math.max(0, volumePercent))
					);

					patchState(store, { browserVolume: volume });
					effect.saveBrowserVolume(volume);

					if (!store.remoteDeviceId()) {
						patchState(store, { volume });
						player?.setVolume(volume / 100).catch(fail);
					}
				},

				/** Plays on the device from now on; moves what is playing there. */
				async selectDevice(deviceId: string | null): Promise<void> {
					void player?.activateElement();
					const target = deviceId ?? store.browserDeviceId();
					patchState(store, { selectedDeviceId: deviceId });
					volumeChangedAt = 0;
					void syncVolume(deviceId);
					pollWhenRemote();

					const nowPlaying = store.nowPlaying();
					if (!target || !nowPlaying) {
						return;
					}
					try {
						await effect.transfer(target, !nowPlaying.paused);
						patchState(store, { error: null });
					} catch (error) {
						fail(error);
					}
				},
			};
		}
	),
	withHooks({
		onInit(store, effect = inject(SpotifyPlaybackEffect)) {
			patchState(store, {
				configured: effect.configured,
				volume: effect.browserVolume,
				browserVolume: effect.browserVolume,
			});
			void store.start();
		},
	})
);
