import {
	Observable,
	TimeoutError,
	distinctUntilChanged,
	filter,
	firstValueFrom,
	of,
	pipe,
	switchMap,
	tap,
	timeout,
} from 'rxjs';

import {
	DOCUMENT,
	DestroyRef,
	computed,
	effect,
	inject,
	signal,
	untracked,
} from '@angular/core';
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
import { ExternalPlayerConsentService } from '../../data/external-player';
import { PlayLogEffect, PlayLogEntry } from '../../data/play-log';
import {
	RADIO_SHUFFLE_SETTING,
	RadioEffect,
	RadioStation,
	shuffle,
} from '../../data/radio';
import {
	PlayerContext,
	PlayerSettings,
	PlayerSettingsEffect,
	PlayerSettingsOverrides,
	PlayerSource,
	resolvePlayerSettings,
} from '../../data/player';
import {
	TrackToMatch,
	currentPositionMs,
	spotifyEmbedUri,
} from '../../data/spotify';
import { UserSettingsEffect } from '../../data/user-settings';
import { TrackDetailsEffect } from '../../data/track-details';
import { SpotifyEmbedStore } from '../spotify/spotify-embed.store';
import { SpotifyPlaybackStore } from '../spotify/spotify-playback.store';
import {
	YoutubeAlbum,
	YoutubeItem,
	YoutubePlaybackStore,
} from '../youtube/youtube-playback.store';

import { TrackSide, sideBreaks } from './sides';

export type { PlayerSource };

/**
 * Below this much actually played, a record was not listened to — it was
 * passed over on the way to another one, and the log stays quiet about it.
 */
const MIN_SITTING_MS = 30_000;

/** How long a station may take to choose its records before it gives up. */
const TUNING_TIMEOUT_MS = 10_000;

/**
 * Records the queue may pass over in a row before it gives up. Without a
 * limit, a station tuned in before the Spotify sign-in would run through
 * everything it holds in one go.
 */
const MAX_PASSED_OVER = 5;

/**
 * One sitting with one album, while it lasts. Only what the player itself
 * put on is followed: an album started on the phone is Spotify's own history
 * to keep, and the app does not know which record of the catalog it is.
 */
interface Sitting {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	source: PlayerSource;
	startedAt: number;
	trackCount: number;
	/** Tracks of the album heard, by id. */
	heard: Set<string>;
	/** Milliseconds played, of the spans that have ended. */
	playedMs: number;
	/** When the span playing now began; null while it is paused. */
	playingSince: number | null;
	/** When it last played. */
	endedAt: number;
}

/** Milliseconds heard, the open span included. */
const heardMs = (sitting: Sitting, at: number): number =>
	sitting.playedMs +
	(sitting.playingSince !== null ? at - sitting.playingSince : 0);

/** The sitting as the log keeps it. */
const toLogEntry = (sitting: Sitting, at: number): PlayLogEntry => ({
	uid: `${sitting.albumId}-${sitting.startedAt}`,
	albumId: sitting.albumId,
	albumTitle: sitting.albumTitle,
	artistName: sitting.artistName,
	source: sitting.source,
	startedAt: sitting.startedAt,
	endedAt: sitting.playingSince !== null ? at : sitting.endedAt,
	playedMs: heardMs(sitting, at),
	playedTracks: sitting.heard.size,
	trackCount: sitting.trackCount,
	completed:
		sitting.trackCount > 0 && sitting.heard.size >= sitting.trackCount,
});

/** An album, or one of its tracks, to play. */
export interface PlayRequest {
	context: PlayerContext;
	/** Our album id. */
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	coverUrl: string | null;
	/**
	 * The album's styles, as `StyleEnum` spells them. The animated backdrop
	 * reads them to pick which world to build: without them it had to draw a
	 * world out of the band's name, so the look was different per record but
	 * never actually about the music.
	 */
	styles: string[];
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
	/** The record is waiting to be turned over; null while it plays on. */
	sideBreak: SideBreak | null;
	/**
	 * The side the collector has already been let through, so the hold does
	 * not catch the same track again the moment it plays on.
	 */
	sideResumedTrackId: string | null;
	/** Records waiting to go on after this one, by album id. */
	queue: string[];
	/** The station that filled the queue; null when nobody did. */
	station: RadioStation | null;
	/** What that station is called, for the player to say what is on. */
	stationLabel: string | null;
	/** A station is being tuned in: its records are being chosen. */
	tuning: boolean;
	/** Queues are put on in a random order. */
	shuffled: boolean;
}

/** A record waiting in the queue, as a list of what is coming shows it. */
export interface QueuedRecord {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	coverUrl: string | null;
}

/** Playback held at the start of a side, waiting to be let on. */
export interface SideBreak {
	/** The track the side starts with. */
	trackId: string;
	/** "Side B", as the prompt names it. */
	label: string;
}

/** A track of the catalog as the player holds it. */
export const toTrackToMatch = ({
	uid,
	name,
	index,
	position,
}: TrackEntity): TrackToMatch => ({
	id: uid,
	name,
	index,
	position,
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
		styles: album.styles ?? [],
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
		sideBreak: null,
		sideResumedTrackId: null,
		queue: [],
		station: null,
		stationLabel: null,
		tuning: false,
		shuffled: false,
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
			embed = inject(SpotifyEmbedStore),
			youtube = inject(YoutubePlaybackStore),
			albumStateService = inject(AlbumStateService),
			consent = inject(ExternalPlayerConsentService)
		) => {
			const albums = toSignal(albumStateService.selectEntities$(), {
				initialValue: [] as AlbumEntity[],
			});

			const settingsFor = (context: PlayerContext | undefined) =>
				resolvePlayerSettings(context ?? 'default', store.overrides());

			const availableFor = (request: PlayRequest | null) => ({
				// Spotify's embedded player needs no app of ours and no
				// token, so the source is there the moment the album has a
				// Spotify id. Their own app is what lets this player drive
				// Spotify rather than hand the album to Spotify's own frame.
				spotify: !!request?.spotifyAlbumId,
				youtube:
					!!request?.youtubeVideoId ||
					!!request?.youtubePlaylistId ||
					!!request?.youtubeVideoIds.length,
			});

			/**
			 * The source a request would be played on, and null where there
			 * is none.
			 *
			 * This is where the outside players are let in or kept out. Both
			 * sources are somebody else's player: embedding one writes their
			 * storage and reports the visit, so without the collector's leave
			 * there is no source at all — which is what every play button,
			 * the stage and `start` itself already read.
			 */
			const sourceFor = (
				request: PlayRequest | null
			): PlayerSource | null => {
				if (!consent.allowed()) {
					return null;
				}
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

			/**
			 * Spotify's embedded frame holds this record and can be pressed
			 * from here.
			 *
			 * For a collector who has not registered their own Spotify app
			 * the frame is the whole of Spotify, so the play button over it
			 * presses that rather than doing nothing. It reaches no further
			 * than the page showing it: this one record, play and pause, and
			 * not a track it could name, a next, or a volume.
			 */
			const embedDrives = (request: PlayRequest | null): boolean => {
				const uri = spotifyEmbedUri(
					request?.spotifyAlbumId,
					request?.spotifyTrackId
				);

				return (
					!!uri &&
					sourceFor(request) === 'spotify' &&
					!spotify.connected() &&
					// A collector who registered an app did it for the
					// playback this player drives, so their play button
					// still takes them to the sign-in that buys it.
					!spotify.hasOwnApp() &&
					embed.controllable() &&
					embed.uri() === uri
				);
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

			/**
			 * Where the record on show has to be turned over, by the track id
			 * the side starts with. Empty for a release without sides.
			 */
			const sides = computed(() => {
				const request = shown().request;

				return request
					? sideBreaks(request.tracks)
					: new Map<string, TrackSide>();
			});

			const durationMs = computed(() => {
				const current = now();
				if (!current) {
					// Nothing of ours plays: the frame still says how long
					// what is in it runs, which is all it says.
					return embedDrives(shown().request)
						? embed.durationMs()
						: 0;
				}
				return current.source === 'spotify'
					? (spotify.nowPlaying()?.durationMs ?? 0)
					: youtube.durationMs();
			});

			return {
				now,
				sides,
				/** The record on show has sides, so it can be turned over. */
				hasSides: computed(() => sides().size > 0),
				/**
				 * The records waiting to go on, in the order they will. The
				 * queue holds ids and the catalog holds the titles, so a
				 * record the catalog cannot name is left out of the list
				 * rather than standing in it as a blank — the count beside
				 * it comes from the queue itself and stays true.
				 */
				queueRecords: computed((): QueuedRecord[] => {
					const named = new Map(
						(albums() ?? []).map((album) => [album.uid, album])
					);

					return store.queue().flatMap((albumId) => {
						const album = named.get(albumId);

						return album
							? [
									{
										albumId,
										albumTitle: album.name,
										artistName: album.artist?.name ?? null,
										coverUrl:
											album.coverImage?.filePath ||
											album.coverImageUrl ||
											null,
									},
								]
							: [];
					});
				}),
				pageActive,
				/** The page's album / track plays now. */
				pagePlaying: computed(
					() =>
						(pageActive() && !!now()?.playing) ||
						(embedDrives(store.page()) && embed.playing())
				),
				/**
				 * The page's album / track can be played — by this player,
				 * or by pressing the frame the page puts it in. Where neither
				 * can, no button is offered: one that does nothing when
				 * pressed is worse than none at all.
				 */
				pagePlayable: computed(() => {
					const page = store.page();
					const source = sourceFor(page);

					return (
						!!source &&
						(source !== 'spotify' ||
							spotify.connected() ||
							spotify.hasOwnApp() ||
							embedDrives(page))
					);
				}),
				/** What plays is the page's frame, not this player. */
				embedDrives: computed(() => embedDrives),
				shown,
				settings,
				/** Sources for the settings menu. */
				available: computed(() => availableFor(shown().request)),
				/** The source the stage's play button uses. */
				source: computed(
					() => now()?.source ?? sourceFor(shown().request)
				),
				playing: computed(
					() =>
						!!now()?.playing ||
						(embedDrives(shown().request) && embed.playing())
				),
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
						!spotify.connected() &&
						// The frame plays it without any sign-in at all.
						!embedDrives(shown().request)
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
						? (spotify.error() ?? embed.error())
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
				/** Their own app is named: this player can drive Spotify. */
				spotifyHasOwnApp: computed(() => spotify.hasOwnApp()),
				/** The collector's own Spotify app, when they named one. */
				spotifyClientId: computed(() => spotify.clientId()),
				/** What that app has to send the sign-in back to. */
				spotifyRedirectUri: computed(() => spotify.redirectUri()),
				spotifyConnected: computed(() => spotify.connected()),
				spotifyConnecting: computed(
					() => spotify.status() === 'connecting'
				),
				/** Spotify Connect devices other than this browser. */
				devices: computed(() => spotify.otherDevices()),
				/** Chosen output device; null plays in this browser. */
				selectedDeviceId: computed(() => spotify.selectedDeviceId()),
				/** Volume the browser player starts at, 0–100. */
				spotifyBrowserVolume: computed(() => spotify.browserVolume()),
				/** The outside players may be put on the page at all. */
				playersAllowed: computed(() => consent.allowed()),
				/**
				 * Albums of the catalog this player can start itself — none
				 * at all while the outside players are not allowed, so a
				 * button that could only disappoint is never offered.
				 *
				 * A Spotify album counts only with the collector's own app:
				 * Spotify's embedded frame plays on the album's own page, but
				 * nothing here can press its play button for them.
				 */
				playableAlbumIds: computed(
					() =>
						new Set(
							(consent.allowed() ? (albums() ?? []) : [])
								.filter(
									(album) =>
										(isSpotifyAlbumId(
											album.spotifyAlbumId
										) &&
											spotify.hasOwnApp()) ||
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
			embed = inject(SpotifyEmbedStore),
			youtube = inject(YoutubePlaybackStore),
			audioCaptureEffect = inject(AudioCaptureEffect),
			radioEffect = inject(RadioEffect),
			userSettingsEffect = inject(UserSettingsEffect)
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

			/** The kind of page the player is on, which the menu applies to. */
			const shownContext = (): PlayerContext =>
				store.shown().request?.context ?? 'default';

			const updateFor = (
				context: PlayerContext,
				changes: Partial<PlayerSettings>
			) => {
				saveOverrides({
					...store.overrides(),
					[context]: { ...store.overrides()[context], ...changes },
				});
			};

			const resetFor = (context: PlayerContext) => {
				const overrides = { ...store.overrides() };

				delete overrides[context];
				saveOverrides(overrides);
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
					// Their own app buys the queue, the stage and their own
					// speakers, so a collector who has one is sent to sign in
					// rather than left with the frame.
					if (spotify.hasOwnApp()) {
						await spotify.connect();

						return;
					}
					// Otherwise the page's own frame is the whole of Spotify
					// here, and pressing it is the one thing this can do.
					if (store.embedDrives()(request)) {
						await embed.play();
					}

					return;
				}
				patchState(store, {
					session: request,
					sessionSource: source,
					sideBreak: null,
					sideResumedTrackId: null,
				});
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

			/** Plays an album of the catalog from its start. */
			const playAlbumById = async (albumId: string): Promise<void> => {
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
					const album = albums.find((item) => item.uid === albumId);

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
			};

			/**
			 * The records of a queue in the order they go on: as they came,
			 * or drawn out of a hat where the collector asked for that.
			 */
			const inOrder = (albumIds: readonly string[]): string[] =>
				store.shuffled() ? shuffle(albumIds) : [...albumIds];

			/**
			 * The next record of the queue, or the end of the station. A
			 * record that turns out to have nothing to play on is passed
			 * over rather than leaving the queue stuck on it.
			 */
			const playNextAlbum = async (passedOver = 0): Promise<void> => {
				const [next, ...rest] = store.queue();

				patchState(store, { queue: rest });
				if (!next) {
					patchState(store, { station: null, stationLabel: null });

					return;
				}
				await playAlbumById(next);
				if (
					store.session()?.albumId !== next &&
					passedOver < MAX_PASSED_OVER
				) {
					await playNextAlbum(passedOver + 1);
				}
			};

			const toggle = async (): Promise<void> => {
				const current = store.now();
				if (current?.source === 'spotify') {
					await spotify.togglePlay();
				} else if (current?.source === 'youtube') {
					youtube.togglePlay();
				} else if (store.embedDrives()(store.shown().request)) {
					// Nothing of ours plays, but the page's frame does.
					await embed.togglePlay();
				}
			};

			/**
			 * Holds playback where the record has to be turned over: the side
			 * has already begun by the time the source reports it, so it is
			 * wound back to its first track's start and waits there.
			 */
			const holdAtSide = async (
				trackId: string,
				label: string
			): Promise<void> => {
				patchState(store, { sideBreak: { trackId, label } });
				const current = store.now();

				if (current?.source === 'spotify') {
					await spotify.togglePlay();
					await spotify.seek(0);
				} else if (current?.source === 'youtube') {
					youtube.togglePlay();
					youtube.seek(0);
				}
			};

			/** Lets the record play on from the side it was held at. */
			const continueSide = async (): Promise<void> => {
				const held = store.sideBreak();

				if (!held) {
					return;
				}
				patchState(store, {
					sideBreak: null,
					sideResumedTrackId: held.trackId,
				});
				await toggle();
			};

			/**
			 * Unlocks Spotify's audio element. Safari only lets sound start
			 * from the tap itself, so every method that begins playback calls
			 * this before its first `await` — by then the tap no longer counts.
			 */
			const activate = () => spotify.activate();

			return {
				activate,

				/** Lets the record play on from the side it was held at. */
				continueSide,

				/**
				 * Holds the record at a side, for the watcher below to call
				 * when playback runs into a turnover.
				 */
				holdAtSide,

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
					if (store.sideBreak() && store.pageActive()) {
						await continueSide();
					} else if (store.pageActive()) {
						await toggle();
					} else if (store.embedDrives()(page)) {
						// The page's frame is what plays it: the same button
						// pauses and lets it on again.
						await embed.togglePlay();
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
						// Asked for by name: no record is turned over here.
						patchState(store, { sideResumedTrackId: trackId });
					}
				},

				/** Plays an album of the catalog from its start. */
				playAlbum(albumId: string): Promise<void> {
					activate();

					return playAlbumById(albumId);
				},

				/**
				 * Tunes in a station: chooses its records, puts the first on
				 * and leaves the rest waiting.
				 */
				async startStation(
					station: RadioStation,
					label: string
				): Promise<void> {
					if (!store.playersAllowed()) {
						return;
					}
					activate();
					patchState(store, { tuning: true });
					try {
						const albumIds = await firstValueFrom(
							radioEffect
								.albums$(station, store.playableAlbumIds())
								.pipe(
									filter((ids) => ids.length > 0),
									// The catalog and the shelf arrive on
									// their own time; a station that never
									// fills is one with nothing to play.
									timeout(TUNING_TIMEOUT_MS)
								)
						);
						const [first, ...rest] = inOrder(albumIds);

						patchState(store, {
							queue: rest,
							station,
							stationLabel: label,
						});
						await playAlbumById(first);
					} catch (error) {
						patchState(store, {
							queue: [],
							station: null,
							stationLabel: null,
						});
						if (!(error instanceof TimeoutError)) {
							console.error(error);
						}
					} finally {
						patchState(store, { tuning: false });
					}
				},

				/**
				 * Plays a run of records one after another — what stands in
				 * one compartment, what a page has in front of it. A station
				 * proper goes through `startStation`; this is the same queue
				 * without a rule behind it.
				 */
				async playQueue(
					albumIds: readonly string[],
					label: string
				): Promise<void> {
					activate();
					const playable = store.playableAlbumIds();
					const [first, ...rest] = inOrder(
						albumIds.filter((albumId) => playable.has(albumId))
					);

					if (!first) {
						return;
					}
					patchState(store, {
						queue: rest,
						station: null,
						stationLabel: label,
					});
					await playAlbumById(first);
				},

				/** Puts the next record of the queue on. */
				playNextAlbum(): Promise<void> {
					activate();

					return playNextAlbum();
				},

				/**
				 * Puts a record of the queue on now, passing over the ones
				 * standing before it — they have had their turn.
				 */
				playQueuedAlbum(albumId: string): Promise<void> {
					activate();
					const waiting = store.queue();
					const at = waiting.indexOf(albumId);

					if (at < 0) {
						return Promise.resolve();
					}
					patchState(store, { queue: waiting.slice(at + 1) });

					return playAlbumById(albumId);
				},

				/**
				 * Whether queues are put on in a random order. Turning it on
				 * draws the records still waiting again; turning it off
				 * leaves them as they stand, since the order they came in is
				 * not kept anywhere to be put back.
				 */
				setShuffled(shuffled: boolean): void {
					const waiting = store.queue();

					patchState(store, {
						shuffled,
						queue: shuffled ? shuffle(waiting) : waiting,
					});
					userSettingsEffect
						.save(RADIO_SHUFFLE_SETTING, shuffled)
						.catch((error) =>
							console.error('Shuffle not kept', error)
						);
				},

				/** The kept answer, which the collector gave last time. */
				loadShuffled: rxMethod<void>(
					pipe(
						switchMap(() =>
							userSettingsEffect.value$(RADIO_SHUFFLE_SETTING)
						),
						tap((shuffled) => patchState(store, { shuffled }))
					)
				),

				/** Takes the queue off; what plays now plays to its end. */
				stopStation(): void {
					patchState(store, {
						queue: [],
						station: null,
						stationLabel: null,
					});
				},

				/** Pauses / resumes what plays, or starts what is shown. */
				async togglePlay(): Promise<void> {
					activate();
					const request = store.shown().request;
					if (store.sideBreak()) {
						await continueSide();
					} else if (store.now() || store.embedDrives()(request)) {
						await toggle();
					} else if (request) {
						await start(request);
					}
				},

				skip(direction: 'previous' | 'next'): void {
					const current = store.now();
					// Skipped into a side deliberately: it is not a turnover.
					const tracks = store.shown().request?.tracks ?? [];
					const at = tracks.findIndex(
						(track) => track.id === current?.trackId
					);
					const target =
						tracks[at + (direction === 'next' ? 1 : -1)]?.id ??
						null;

					patchState(store, { sideResumedTrackId: target });
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
					if (store.embedDrives()(store.shown().request)) {
						// The frame reports where it is now and then; the
						// seconds in between are counted here, as they are
						// for the sources this player drives itself.
						const position = embed.playing()
							? embed.positionMs() + (now - embed.positionAt())
							: embed.positionMs();

						return Math.min(
							Math.max(0, position),
							embed.durationMs() || position
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

				/** Names the collector's own Spotify app (empty: forgets it). */
				saveSpotifyClientId(clientId: string): Promise<void> {
					return spotify.saveClientId(clientId);
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

				/** The volume the browser player starts at, 0–100. */
				setSpotifyBrowserVolume(volumePercent: number): void {
					spotify.setBrowserVolume(volumePercent);
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
					updateFor(shownContext(), changes);
				},

				/** Back to the defaults of the shown kind of page. */
				resetSettings(): void {
					resetFor(shownContext());
				},

				/**
				 * The same, for a kind of page that is not on show — the
				 * profile sets all of them at once.
				 */
				updateSettingsFor(
					context: PlayerContext,
					changes: Partial<PlayerSettings>
				): void {
					updateFor(context, changes);
				},

				resetSettingsFor(context: PlayerContext): void {
					resetFor(context);
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
		onInit(
			store,
			spotify = inject(SpotifyPlaybackStore),
			youtube = inject(YoutubePlaybackStore),
			playLog = inject(PlayLogEffect),
			document = inject(DOCUMENT),
			destroyRef = inject(DestroyRef)
		) {
			store.loadSettings(of(undefined));
			store.loadShuffled(of(undefined));
			store.loadLyrics(() => store.shown().trackId);

			// Playing on into a new side: hold there until the collector has
			// turned the record over.
			effect(() => {
				const current = store.now();
				const trackId = current?.trackId ?? null;
				const side = trackId ? store.sides().get(trackId) : null;

				if (
					!side ||
					!trackId ||
					!current?.playing ||
					!store.settings().sideBreak ||
					store.sideBreak() ||
					store.sideResumedTrackId() === trackId
				) {
					return;
				}
				untracked(() => void store.holdAtSide(trackId, side.label));
			});

			// The album being listened to now; one document per sitting.
			let sitting: Sitting | null = null;
			const playNextOfQueue = () =>
				store
					.playNextAlbum()
					.catch((error) =>
						console.error('The next record did not go on', error)
					);

			/**
			 * Writes the sitting out. `end` leaves it behind (the album is
			 * over); without it the same document is written again as the
			 * record plays on — the id holds the moment it started, so the
			 * two are one play, not two.
			 */
			const flush = (end: boolean): void => {
				const at = Date.now();
				const done = sitting;

				if (end) {
					sitting = null;
				}
				if (!done || heardMs(done, at) < MIN_SITTING_MS) {
					return;
				}
				if (playLog.recording) {
					playLog
						.record(toLogEntry(done, at))
						.catch((error) =>
							console.error('Listening not logged', error)
						);
				}
			};

			/**
			 * The record ran out on its own, rather than being stopped. On
			 * YouTube the player says so; Spotify parks on the last track of
			 * the album with nothing left to play.
			 */
			const ranOut = (): boolean => {
				const current = store.now();
				const request = store.session();
				const last = request?.tracks[request.tracks.length - 1];

				// A record held to be turned over looks stopped, and on a
				// last side of one track it even looks finished. It is not:
				// it is waiting for a hand.
				if (!current || current.playing || !last || store.sideBreak()) {
					return false;
				}

				return current.source === 'youtube'
					? youtube.ended()
					: current.trackId === last.id &&
							spotify.nowPlaying()?.positionMs === 0;
			};

			/** Whether this record has actually played, so it can run out. */
			let played = false;

			// What is playing, as the log follows it, and where the queue
			// takes over once a record has run out.
			effect(() => {
				const current = store.now();
				const session = store.session();
				const at = Date.now();

				untracked(() => {
					const albumId = current?.albumId ?? null;
					const ours =
						!!current &&
						!!session &&
						!!albumId &&
						session.albumId === albumId;

					if (sitting && sitting.albumId !== albumId) {
						// Another record went on, or the player fell silent.
						played = false;
						if (sitting.playingSince !== null) {
							sitting.playedMs += at - sitting.playingSince;
							sitting.playingSince = null;
							sitting.endedAt = at;
						}
						flush(true);
					}
					if (!ours || !current || !session) {
						return;
					}
					sitting ??= {
						albumId: albumId as string,
						albumTitle: session.albumTitle,
						artistName: session.artistName,
						source: current.source,
						startedAt: at,
						trackCount: session.tracks.length,
						heard: new Set<string>(),
						playedMs: 0,
						playingSince: null,
						endedAt: at,
					};
					if (current.playing) {
						sitting.playingSince ??= at;
						sitting.endedAt = at;
						if (current.trackId) {
							sitting.heard.add(current.trackId);
						}
					} else if (sitting.playingSince !== null) {
						sitting.playedMs += at - sitting.playingSince;
						sitting.playingSince = null;
						sitting.endedAt = at;
					}

					if (current.playing) {
						played = true;
					} else if (played && store.queue().length && ranOut()) {
						played = false;
						void playNextOfQueue();
					}
				});
			});

			/**
			 * The leave taken back while a record plays. The shell takes the
			 * dock, the stage and the mini player off the page at once, so
			 * what is playing would play on with nothing left to stop it.
			 *
			 * Only playback is ended here. Whether withdrawing also signs the
			 * account out of Spotify is the consent's question, not the
			 * player's, and this does not answer it.
			 */
			effect(() => {
				if (store.playersAllowed()) {
					return;
				}
				untracked(() => {
					if (!store.now() && !store.queue().length) {
						return;
					}
					const nowPlaying = spotify.nowPlaying();

					if (nowPlaying && !nowPlaying.paused) {
						void spotify.togglePlay();
					}
					youtube.close();
					store.stopStation();
					flush(true);
				});
			});

			// A tab being hidden may never come back: keep what was heard.
			const onVisibilityChange = () => {
				if (document.visibilityState === 'hidden') {
					flush(false);
				}
			};

			document.addEventListener('visibilitychange', onVisibilityChange);
			destroyRef.onDestroy(() =>
				document.removeEventListener(
					'visibilitychange',
					onVisibilityChange
				)
			);

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
