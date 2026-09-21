import {
	Observable,
	distinctUntilChanged,
	filter,
	firstValueFrom,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
	AlbumEntity,
	AlbumStateService,
	TrackEntity,
	TrackLyrics,
	isSpotifyAlbumId,
	isYoutubePlaylistId,
	isYoutubeVideoId,
} from '@music-collection/api';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withProps,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { AlbumDetailsEffect } from '../../data/album-details';
import { AudioCapture, AudioCaptureEffect } from '../../data/audio';
import {
	PlayerContext,
	PlayerSettings,
	PlayerSettingsEffect,
	PlayerSettingsOverrides,
	resolvePlayerSettings,
} from '../../data/player';
import { TrackToMatch, currentPositionMs } from '../../data/spotify';
import { TrackDetailsEffect } from '../../data/track-details';
import { SpotifyPlaybackStore } from '../spotify/spotify-playback.store';
import {
	YoutubeAlbum,
	YoutubeItem,
	YoutubePlaybackStore,
} from '../youtube/youtube-playback.store';

export type PlayerSource = 'spotify' | 'youtube';

/** An album, or one of its tracks, to play. */
export interface PlayRequest {
	context: PlayerContext;
	/** Our album id. */
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	coverUrl: string | null;
	spotifyAlbumId: string | null;
	youtubePlaylistId: string | null;
	/** The album's tracks in play order. */
	tracks: TrackToMatch[];
	/** Our id of the track in focus; null for the whole album. */
	trackId: string | null;
	trackName: string | null;
	/** YouTube video of the track in focus. */
	youtubeVideoId: string | null;
	/** Spotify track in focus, for the preview player when not signed in. */
	spotifyTrackId: string | null;
	/** The album's other YouTube videos. */
	youtubeVideoIds: string[];
}

/** What plays now, whichever source it is on. */
export interface NowPlaying {
	source: PlayerSource;
	title: string;
	subtitle: string;
	coverUrl: string | null;
	playing: boolean;
	/** Our album and track, when what plays is one of ours. */
	albumId: string | null;
	trackId: string | null;
}

interface PlayerState {
	/** What the current page shows. */
	page: PlayRequest | null;
	/** What was last started, and on which source. */
	session: PlayRequest | null;
	sessionSource: PlayerSource | null;
	overrides: PlayerSettingsOverrides;
	stageOpen: boolean;
	/** Lyrics of the track on show. */
	lyrics: TrackLyrics | null;
	/** Album being loaded to be played. */
	loadingAlbumId: string | null;
	/** The tab's sound is analysed for the visuals. */
	audioStatus: 'off' | 'starting' | 'on';
	audioError: string | null;
}

const toTrackToMatch = ({ uid, name, index }: TrackEntity): TrackToMatch => ({
	id: uid,
	name,
	index,
});

/** An album of the catalog as something to play. */
export function albumPlayRequest(
	album: AlbumEntity,
	tracks: TrackEntity[],
	context: PlayerContext = 'album'
): PlayRequest {
	return {
		context,
		albumId: album.uid,
		albumTitle: album.name,
		artistName: album.artist?.name ?? null,
		coverUrl: album.coverImage?.filePath || album.coverImageUrl || null,
		spotifyAlbumId: isSpotifyAlbumId(album.spotifyAlbumId)
			? album.spotifyAlbumId
			: null,
		youtubePlaylistId: isYoutubePlaylistId(album.youtubePlaylistId)
			? album.youtubePlaylistId
			: null,
		tracks: tracks.map(toTrackToMatch),
		trackId: null,
		trackName: null,
		youtubeVideoId: null,
		spotifyTrackId: null,
		youtubeVideoIds: (album.youtubeVideoIds ?? []).filter(isYoutubeVideoId),
	};
}

/**
 * A request as an album of the YouTube player: the track's video first, then
 * the album playlist and the other videos.
 */
export function youtubeAlbumOf(request: PlayRequest): YoutubeAlbum {
	const items: YoutubeItem[] = [];
	if (request.youtubeVideoId) {
		items.push({ kind: 'video', id: request.youtubeVideoId });
	}
	if (request.youtubePlaylistId) {
		items.push({ kind: 'playlist', id: request.youtubePlaylistId });
	}
	for (const id of request.youtubeVideoIds) {
		if (id !== request.youtubeVideoId) {
			items.push({ kind: 'video', id });
		}
	}
	return {
		uid: request.albumId,
		title: request.albumTitle,
		artistName: request.artistName ?? '',
		coverUrl: request.coverUrl,
		items,
		trackNames: request.tracks.map((track) => track.name),
	};
}

/**
 * The app's one player. Pages tell it what they show (`setPage`) and start
 * it; it plays on Spotify or YouTube as the settings of the page's kind say,
 * and tells what plays in one shape whichever source it is on. Playback goes
 * on across pages.
 */
export const PlayerStore = signalStore(
	{ providedIn: 'root' },
	withState<PlayerState>({
		page: null,
		session: null,
		sessionSource: null,
		overrides: {},
		stageOpen: false,
		lyrics: null,
		loadingAlbumId: null,
		audioStatus: 'off',
		audioError: null,
	}),
	withProps(() => ({
		/**
		 * The live analyser of the tab's sound. A plain signal: a browser
		 * object must not go into the (frozen) store state.
		 */
		analyser: signal<AnalyserNode | null>(null),
	})),
	withComputed(
		(
			store,
			spotify = inject(SpotifyPlaybackStore),
			youtube = inject(YoutubePlaybackStore),
			albumStateService = inject(AlbumStateService)
		) => {
			const albums = toSignal(albumStateService.selectEntities$(), {
				initialValue: [] as AlbumEntity[],
			});

			const settingsFor = (context: PlayerContext | undefined) =>
				resolvePlayerSettings(context ?? 'default', store.overrides());

			const availableFor = (request: PlayRequest | null) => ({
				spotify: !!request?.spotifyAlbumId && spotify.configured(),
				youtube:
					!!request?.youtubeVideoId ||
					!!request?.youtubePlaylistId ||
					!!request?.youtubeVideoIds.length,
			});

			/** The source a request would be played on. */
			const sourceFor = (
				request: PlayRequest | null
			): PlayerSource | null => {
				const { spotify: onSpotify, youtube: onYoutube } =
					availableFor(request);
				switch (settingsFor(request?.context).source) {
					case 'spotify':
						return onSpotify
							? 'spotify'
							: onYoutube
								? 'youtube'
								: null;
					case 'youtube':
						return onYoutube
							? 'youtube'
							: onSpotify
								? 'spotify'
								: null;
					default:
						// Spotify when signed in to it, else YouTube, else
						// Spotify (it offers the sign-in).
						return onSpotify && spotify.connected()
							? 'spotify'
							: onYoutube
								? 'youtube'
								: onSpotify
									? 'spotify'
									: null;
				}
			};

			/** The session or the page, whichever is about the album. */
			const requestFor = (
				matches: (request: PlayRequest) => boolean
			): PlayRequest | null => {
				const session = store.session();
				const page = store.page();
				return session && matches(session)
					? session
					: page && matches(page)
						? page
						: null;
			};

			const spotifyNow = computed<NowPlaying | null>(() => {
				const nowPlaying = spotify.nowPlaying();
				if (!spotify.connected() || !nowPlaying) {
					return null;
				}
				const session = requestFor(
					(request) =>
						!!request.spotifyAlbumId &&
						nowPlaying.albumUri ===
							`spotify:album:${request.spotifyAlbumId}`
				);

				const trackId =
					session &&
					spotify.tracksAlbumId() === session.spotifyAlbumId
						? (Object.entries(spotify.trackUris()).find(
								([, uri]) => uri === nowPlaying.trackUri
							)?.[0] ?? null)
						: null;
				// Started elsewhere (e.g. on the phone): our album, if in the catalog.
				const spotifyAlbumId = nowPlaying.albumUri.replace(
					'spotify:album:',
					''
				);
				const catalogAlbumId = session
					? session.albumId
					: (albums()?.find(
							(album) => album.spotifyAlbumId === spotifyAlbumId
						)?.uid ?? null);
				return {
					source: 'spotify',
					title: nowPlaying.trackName,
					subtitle: nowPlaying.artists,
					coverUrl: session
						? (session.coverUrl ?? nowPlaying.imageUrl)
						: nowPlaying.imageUrl,
					playing: !nowPlaying.paused,
					albumId: catalogAlbumId,
					trackId,
				};
			});

			const youtubeNow = computed<NowPlaying | null>(() => {
				const album = youtube.album();
				if (!album || !youtube.started()) {
					return null;
				}
				const ours = requestFor(
					(request) => request.albumId === album.uid
				);
				const selection = youtube.selection();
				let trackId: string | null = null;
				if (ours && selection?.kind === 'video') {
					trackId =
						selection.id === ours.youtubeVideoId
							? ours.trackId
							: null;
				} else if (ours && selection?.kind === 'playlist') {
					const index = youtube.playlistIndex();
					trackId =
						index !== null
							? (ours.tracks[index]?.id ?? null)
							: null;
				}
				return {
					source: 'youtube',
					title: youtube.nowPlayingTitle() ?? album.title,
					subtitle: album.artistName,
					coverUrl: album.coverUrl,
					playing: youtube.playing(),
					albumId: album.uid,
					trackId,
				};
			});

			/** The session's source first, then whichever plays. */
			const now = computed<NowPlaying | null>(() => {
				const onSpotify = spotifyNow();
				const onYoutube = youtubeNow();
				if (store.sessionSource() === 'youtube') {
					return onYoutube ?? onSpotify;
				}
				if (store.sessionSource() === 'spotify') {
					return onSpotify ?? onYoutube;
				}
				return onYoutube?.playing
					? onYoutube
					: (onSpotify ?? onYoutube);
			});

			/** What the page shows is what is loaded in the player. */
			const pageActive = computed(() => {
				const page = store.page();
				const current = now();
				return (
					!!page &&
					!!current &&
					current.albumId === page.albumId &&
					(!page.trackId || current.trackId === page.trackId)
				);
			});

			/** What the stage shows: what plays, or else the page. */
			const shown = computed(() => {
				const current = now();
				const request = current
					? requestFor(
							(item) =>
								!!current.albumId &&
								item.albumId === current.albumId
						)
					: store.page();
				return {
					request,
					trackId: current
						? current.trackId
						: (request?.trackId ?? null),
				};
			});

			const settings = computed<PlayerSettings>(() =>
				settingsFor(shown().request?.context)
			);

			const durationMs = computed(() => {
				const current = now();
				if (!current) {
					return 0;
				}
				return current.source === 'spotify'
					? (spotify.nowPlaying()?.durationMs ?? 0)
					: youtube.durationMs();
			});

			return {
				now,
				pageActive,
				/** The page's album / track plays now. */
				pagePlaying: computed(() => pageActive() && !!now()?.playing),
				/** The page's album / track can be played. */
				pagePlayable: computed(() => sourceFor(store.page()) !== null),
				shown,
				settings,
				/** Sources for the settings menu. */
				available: computed(() => availableFor(shown().request)),
				/** The source the stage's play button uses. */
				source: computed(
					() => now()?.source ?? sourceFor(shown().request)
				),
				playing: computed(() => !!now()?.playing),
				durationMs,
				canSeek: computed(() => !!now() && durationMs() > 0),
				canSkip: computed(() => {
					const current = now();
					return (
						!!current &&
						(current.source === 'spotify' ||
							youtube.selection()?.kind === 'playlist')
					);
				}),
				/** Waiting for the Spotify sign-in before it can play. */
				needsSpotifyLogin: computed(
					() =>
						!now() &&
						sourceFor(shown().request) === 'spotify' &&
						!spotify.connected()
				),
				/** Volume of what plays (0–100); null when nothing plays. */
				volume: computed(() => {
					const source = now()?.source;
					return source === 'spotify'
						? spotify.volume()
						: source === 'youtube'
							? youtube.volume()
							: null;
				}),
				/** Some Spotify Connect devices do not allow volume changes. */
				volumeSupported: computed(
					() =>
						now()?.source !== 'spotify' || spotify.volumeSupported()
				),
				/** The source's last error, e.g. a missing Premium account. */
				error: computed(() =>
					(now()?.source ?? sourceFor(shown().request)) === 'spotify'
						? spotify.error()
						: null
				),
				sourceFor: computed(() => sourceFor),
				/** The source the page plays on (what plays, when it is the page's). */
				pageSource: computed(() =>
					pageActive() ? now()!.source : sourceFor(store.page())
				),
				pageYoutubeAlbum: computed(() => {
					const page = store.page();
					return page ? youtubeAlbumOf(page) : null;
				}),
				spotifyConfigured: computed(() => spotify.configured()),
				spotifyConnected: computed(() => spotify.connected()),
				spotifyConnecting: computed(
					() => spotify.status() === 'connecting'
				),
				/** Spotify Connect devices other than this browser. */
				devices: computed(() => spotify.otherDevices()),
				/** Chosen output device; null plays in this browser. */
				selectedDeviceId: computed(() => spotify.selectedDeviceId()),
				/** Albums of the catalog with a Spotify or YouTube link. */
				playableAlbumIds: computed(
					() =>
						new Set(
							(albums() ?? [])
								.filter(
									(album) =>
										(isSpotifyAlbumId(
											album.spotifyAlbumId
										) &&
											spotify.configured()) ||
										isYoutubePlaylistId(
											album.youtubePlaylistId
										)
								)
								.map((album) => album.uid)
						)
				),
			};
		}
	),
	withMethods(
		(
			store,
			settingsEffect = inject(PlayerSettingsEffect),
			trackDetailsEffect = inject(TrackDetailsEffect),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			albumStateService = inject(AlbumStateService),
			spotify = inject(SpotifyPlaybackStore),
			youtube = inject(YoutubePlaybackStore),
			audioCaptureEffect = inject(AudioCaptureEffect)
		) => {
			let capture: AudioCapture | null = null;

			const stopCapture = () => {
				capture?.stop();
				capture = null;
				store.analyser.set(null);
				patchState(store, { audioStatus: 'off' });
			};

			const saveOverrides = (overrides: PlayerSettingsOverrides) => {
				patchState(store, { overrides });
				settingsEffect.save(overrides).catch((error) => {
					console.error('Player settings not saved', error);
				});
			};

			/** Plays the request from its track (or the album's start). */
			const start = async (request: PlayRequest): Promise<void> => {
				const source = store.sourceFor()(request);
				if (!source) {
					return;
				}
				const settings = resolvePlayerSettings(
					request.context,
					store.overrides()
				);
				if (source === 'spotify' && !spotify.connected()) {
					await spotify.connect();
					return;
				}
				patchState(store, { session: request, sessionSource: source });
				if (settings.view === 'stage') {
					patchState(store, { stageOpen: true });
				}

				if (source === 'spotify' && request.spotifyAlbumId) {
					if (request.trackId) {
						await spotify.loadAlbumTracks(
							request.spotifyAlbumId,
							request.tracks
						);
					}
					await spotify.play(
						request.spotifyAlbumId,
						request.trackId,
						!settings.autoAdvance
					);
					return;
				}
				const album = youtubeAlbumOf(request);
				const video = album.items.find((item) => item.kind === 'video');
				const playlist = album.items.find(
					(item) => item.kind === 'playlist'
				);
				const index = request.tracks.find(
					(track) => track.id === request.trackId
				)?.index;
				if (request.trackId && video) {
					youtube.playAlbum(album, video);
				} else if (playlist) {
					youtube.playAlbum(
						album,
						playlist,
						index !== undefined ? index - 1 : 0
					);
				}
			};

			const toggle = async (): Promise<void> => {
				const current = store.now();
				if (current?.source === 'spotify') {
					await spotify.togglePlay();
				} else if (current?.source === 'youtube') {
					youtube.togglePlay();
				}
			};

			/**
			 * Unlocks Spotify's audio element. Safari only lets sound start
			 * from the tap itself, so every method that begins playback calls
			 * this before its first `await` — by then the tap no longer counts.
			 */
			const activate = () => spotify.activate();

			return {
				activate,

				/** The page shows an album or track (null: nothing to play). */
				setPage(page: PlayRequest | null): void {
					patchState(store, { page });
				},

				/** The page left; unless another page took over already. */
				clearPage(page: PlayRequest | null): void {
					if (page && store.page() === page) {
						patchState(store, { page: null });
					}
				},

				/** Plays the page's album / track, or pauses / resumes it. */
				async togglePage(): Promise<void> {
					activate();
					const page = store.page();
					if (store.pageActive()) {
						await toggle();
					} else if (page) {
						await start(page);
					}
				},

				/** Plays a track of the page's album. */
				async playPageTrack(trackId: string): Promise<void> {
					activate();
					const page = store.page();
					const track = page?.tracks.find(
						(item) => item.id === trackId
					);
					if (page && track) {
						await start({
							...page,
							trackId,
							trackName: track.name,
							youtubeVideoId: null,
						});
					}
				},

				/** Plays an album of the catalog from its start. */
				async playAlbum(albumId: string): Promise<void> {
					activate();
					patchState(store, { loadingAlbumId: albumId });
					try {
						const albums = await firstValueFrom(
							albumStateService.selectEntities$().pipe(
								tap((all) => {
									if (!all?.length) {
										albumStateService.dispatchListEntitiesAction();
									}
								}),
								filter((all) => all?.length > 0)
							)
						);
						const album = albums.find(
							(item) => item.uid === albumId
						);
						if (!album) {
							return;
						}
						const { tracks } = await firstValueFrom(
							albumDetailsEffect.load$(albumId)
						);
						await start(albumPlayRequest(album, tracks));
					} catch (error) {
						console.error(error);
					} finally {
						patchState(store, { loadingAlbumId: null });
					}
				},

				/** Pauses / resumes what plays, or starts what is shown. */
				async togglePlay(): Promise<void> {
					activate();
					const request = store.shown().request;
					if (store.now()) {
						await toggle();
					} else if (request) {
						await start(request);
					}
				},

				skip(direction: 'previous' | 'next'): void {
					const current = store.now();
					if (current?.source === 'spotify') {
						void spotify.skip(direction);
					} else if (current?.source === 'youtube') {
						youtube.skip(direction);
					}
				},

				/** Where what plays is now, in milliseconds. */
				positionMs(now: number): number {
					const current = store.now();
					if (current?.source === 'spotify') {
						const nowPlaying = spotify.nowPlaying();
						return nowPlaying
							? currentPositionMs(nowPlaying, now)
							: 0;
					}
					if (current?.source === 'youtube') {
						const position = youtube.playing()
							? youtube.positionMs() +
								(now - youtube.positionAt())
							: youtube.positionMs();
						return Math.min(
							Math.max(0, position),
							youtube.durationMs() || position
						);
					}
					return 0;
				},

				seek(positionMs: number): void {
					if (!store.canSeek()) {
						return;
					}
					const position = Math.max(0, positionMs);
					if (store.now()?.source === 'spotify') {
						void spotify.seek(position);
					} else {
						youtube.seek(position);
					}
				},

				setVolume(volumePercent: number): void {
					if (store.now()?.source === 'youtube') {
						youtube.setVolume(volumePercent);
					} else {
						spotify.setVolume(volumePercent);
					}
				},

				connectSpotify(): Promise<void> {
					return spotify.connect();
				},

				disconnectSpotify(): void {
					spotify.disconnect();
				},

				refreshDevices(): Promise<void> {
					return spotify.refreshDevices();
				},

				/** Plays on the device from now on (null: this browser). */
				selectDevice(deviceId: string | null): Promise<void> {
					return spotify.selectDevice(deviceId);
				},

				/** Tab audio capture is possible in this browser. */
				audioCaptureSupported(): boolean {
					return audioCaptureEffect.supported;
				},

				/** Lets the visuals follow the music: asks to share the tab's sound. */
				async startAudioCapture(): Promise<void> {
					if (store.audioStatus() !== 'off') {
						return;
					}
					patchState(store, {
						audioStatus: 'starting',
						audioError: null,
					});
					try {
						capture = await audioCaptureEffect.start();
						store.analyser.set(capture.analyser);
						patchState(store, { audioStatus: 'on' });
						const current = capture;
						// Stopped from the browser's "sharing" bar.
						void current.ended.then(() => {
							if (capture === current) {
								stopCapture();
							}
						});
					} catch (error) {
						capture = null;
						// Cancelling the prompt is no error to show.
						const cancelled =
							error instanceof DOMException &&
							error.name === 'NotAllowedError';
						patchState(store, {
							audioStatus: 'off',
							audioError: cancelled
								? null
								: error instanceof Error
									? error.message
									: String(error),
						});
					}
				},

				stopAudioCapture(): void {
					stopCapture();
				},

				openStage(): void {
					patchState(store, { stageOpen: true });
				},

				closeStage(): void {
					patchState(store, { stageOpen: false });
				},

				/** Changes the settings of the shown kind of page and keeps them. */
				updateSettings(changes: Partial<PlayerSettings>): void {
					const context = store.shown().request?.context ?? 'default';
					saveOverrides({
						...store.overrides(),
						[context]: {
							...store.overrides()[context],
							...changes,
						},
					});
				},

				/** Back to the defaults of the shown kind of page. */
				resetSettings(): void {
					const context = store.shown().request?.context ?? 'default';
					const overrides = { ...store.overrides() };
					delete overrides[context];
					saveOverrides(overrides);
				},

				loadSettings: rxMethod<void>(
					pipe(
						switchMap(() => settingsEffect.overrides$()),
						tap((overrides) => patchState(store, { overrides }))
					)
				),

				/** Follows the lyrics of the track on show. */
				loadLyrics: rxMethod<string | null>(
					pipe(
						distinctUntilChanged(),
						tap(() => patchState(store, { lyrics: null })),
						switchMap((trackId): Observable<TrackLyrics | null> =>
							trackId
								? trackDetailsEffect.lyrics$(trackId)
								: of(null)
						),
						tap((lyrics) => patchState(store, { lyrics }))
					)
				),
			};
		}
	),
	withHooks({
		onInit(store, spotify = inject(SpotifyPlaybackStore)) {
			store.loadSettings(of(undefined));
			store.loadLyrics(() => store.shown().trackId);

			// Signed in to Spotify: map the playing (or shown) album's tracks.
			effect(() => {
				const request = store.session() ?? store.page();
				if (
					spotify.connected() &&
					request?.spotifyAlbumId &&
					request.tracks.length
				) {
					const { spotifyAlbumId, tracks } = request;
					untracked(
						() =>
							void spotify.loadAlbumTracks(spotifyAlbumId, tracks)
					);
				}
			});
		},
	})
);
