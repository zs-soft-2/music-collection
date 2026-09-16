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
	error: string | null;
}

/** Remote devices report no events, so their playback is polled. */
const REMOTE_POLL_MS = 4000;

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
		/** Other devices than this browser. */
		otherDevices: computed(() =>
			store
				.devices()
				.filter((device) => device.id !== store.browserDeviceId())
		),
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
					patchState(store, {
						nowPlaying: await effect.nowPlaying(),
					});
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

			const pollWhenRemote = () => {
				stopPolling();
				if (store.selectedDeviceId()) {
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
							void refreshDevices();
						},
						notReady: () =>
							patchState(store, { browserDeviceId: null }),
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

			return {
				start,
				refreshDevices,

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

				/** Plays the album, from one of its tracks when given. */
				async play(
					albumId: string,
					trackId: string | null
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
						await effect.play(deviceId, albumId, trackUri);
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
						patchState(store, {
							nowPlaying: {
								...nowPlaying,
								paused: !nowPlaying.paused,
							},
						});
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

				/** Plays on the device from now on; moves what is playing there. */
				async selectDevice(deviceId: string | null): Promise<void> {
					void player?.activateElement();
					const target = deviceId ?? store.browserDeviceId();
					patchState(store, { selectedDeviceId: deviceId });
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
			patchState(store, { configured: effect.configured });
			void store.start();
		},
	})
);
