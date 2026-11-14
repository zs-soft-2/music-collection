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

import {
	DOCUMENT,
	DestroyRef,
	computed,
	effect,
	inject,
	untracked,
} from '@angular/core';
import {
	AlbumStateService,
	type TrackClip,
	type TrackImage,
	type TrackLyrics,
} from '@music-collection/api';
import {
	patchState,
	signalStore,
	withComputed,
	withFeature,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { AlbumDetailsEffect } from '../../data/album-details';
import { ExternalPlayerConsentService } from '../../data/external-player';
import { PlayLogEffect } from '../../data/play-log';
import {
	type PlayerContext,
	type PlayerSettings,
	type PlayerSettingsOverrides,
	type PlayerSource,
	resolvePlayerSettings,
} from '../../data/player';
import { currentPositionMs, spotifyEmbedUri } from '../../data/spotify';
import { TrackDetailsEffect } from '../../data/track-details';
import { SpotifyEmbedStore } from '../spotify/spotify-embed.store';
import { SpotifyPlaybackStore } from '../spotify/spotify-playback.store';
import { YoutubePlaybackStore } from '../youtube/youtube-playback.store';

import { withPlayerAudio } from './player-audio.feature';
import { withPlayerCatalog } from './player-catalog.feature';
import { withPlayerQueue } from './player-queue.feature';
import {
	type FinishedRecord,
	type NowPlaying,
	type PlayRequest,
	type SideBreak,
	albumPlayRequest,
	listeningTo,
	onSpotify,
	youtubeAlbumOf,
} from './player-request';
import { withPlayerSettings } from './player-settings.feature';
import { SittingLog } from './player-sitting';
import {
	type AvailableSources,
	chooseSource,
	pickNow,
	runningPositionMs,
} from './player-sources';
import { withPlayerSpotifyAccount } from './player-spotify-account.feature';
import { type TrackSide, sideBreaks } from './sides';

export type { PlayerSource };
export * from './player-request';

/**
 * What the player itself holds. The rest of its state comes with its
 * features: the tab's sound (`withPlayerAudio`) and the queue
 * (`withPlayerQueue`).
 */
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
	/** The source it was asked for on; null when nobody named one. */
	loadingSource: PlayerSource | null;
	/** The record is waiting to be turned over; null while it plays on. */
	sideBreak: SideBreak | null;
	/**
	 * The side the collector has already been let through, so the hold does
	 * not catch the same track again the moment it plays on.
	 */
	sideResumedTrackId: string | null;
	/**
	 * The record that just went round once, waiting for a word about it;
	 * null while there is nothing to ask about. A sitting that was stopped
	 * halfway never lands here: a record somebody walked away from has
	 * already told us what they thought of it.
	 */
	finished: FinishedRecord | null;
}

/**
 * The app's one player. Pages tell it what they show (`setPage`) and start
 * it; it plays on Spotify or YouTube as the settings of the page's kind say,
 * and tells what plays in one shape whichever source it is on. Playback goes
 * on across pages.
 *
 * Mind the names when adding to it: a computed named like a feature's state
 * field is not created, and nothing says so.
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
		loadingSource: null,
		sideBreak: null,
		sideResumedTrackId: null,
		finished: null,
	}),
	withPlayerAudio(),
	withPlayerCatalog(),
	withComputed(
		(
			store,
			spotify = inject(SpotifyPlaybackStore),
			embed = inject(SpotifyEmbedStore),
			youtube = inject(YoutubePlaybackStore),
			consent = inject(ExternalPlayerConsentService)
		) => {
			const albums = store._albums;

			const settingsFor = (context: PlayerContext | undefined) =>
				resolvePlayerSettings(context ?? 'default', store.overrides());

			const availableFor = (
				request: PlayRequest | null
			): AvailableSources => ({
				// Spotify's embedded player needs no app of ours and no
				// token, so the source is there the moment Spotify has the
				// record — or, failing that, the song. Their own app is what
				// lets this player drive Spotify rather than hand the record
				// to Spotify's own frame.
				spotify: !!onSpotify(request),
				// YouTube's frame is nothing this player can offer once its
				// script has been blocked: the frame plays by its own
				// buttons, and every button of ours for it would be dead.
				youtube:
					youtube.controllable() &&
					(!!request?.youtubeVideoId ||
						!!request?.youtubePlaylistId ||
						!!request?.youtubeVideoIds.length),
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
				const available = availableFor(request);

				return chooseSource(
					settingsFor(request?.context).source,
					available,
					() => spotify.connected()
				);
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
				// A record is recognised by the album playing; a song put on
				// without its record, by the song itself — there is no album
				// uri of ours to match it against.
				const onItsOwn = (request: PlayRequest): boolean => {
					const playable = onSpotify(request);

					return (
						playable?.kind === 'track' &&
						nowPlaying.trackUri === `spotify:track:${playable.id}`
					);
				};
				const session = requestFor(
					(request) =>
						(!!request.spotifyAlbumId &&
							nowPlaying.albumUri ===
								`spotify:album:${request.spotifyAlbumId}`) ||
						onItsOwn(request)
				);

				const trackId = !session
					? null
					: onItsOwn(session)
						? session.trackId
						: spotify.tracksAlbumId() === session.spotifyAlbumId
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
			const now = computed<NowPlaying | null>(() =>
				pickNow(store.sessionSource(), spotifyNow(), youtubeNow())
			);

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

			/**
			 * The page's album / track can be played — by this player, or by
			 * pressing the frame the page puts it in. Where neither can, no
			 * button is offered: one that does nothing when pressed is worse
			 * than none at all.
			 */
			const pagePlayable = computed(() => {
				const page = store.page();
				const source = sourceFor(page);

				return (
					!!source &&
					(source !== 'spotify' ||
						spotify.connected() ||
						spotify.hasOwnApp() ||
						embedDrives(page))
				);
			});

			/**
			 * The page puts the record in Spotify's own frame: it plays on
			 * Spotify and the collector has not signed in here, so Spotify's
			 * frame is what carries it.
			 */
			const pageFrame = computed(() => {
				const page = store.page();

				return (
					sourceFor(page) === 'spotify' &&
					!spotify.connected() &&
					!!onSpotify(page)
				);
			});

			/**
			 * The play button on the page is ours to put there.
			 *
			 * Where Spotify's own frame carries the record, that frame's
			 * button is the one place to press: a second remote for the same
			 * device is only a second thing to explain. Signing in — which
			 * is what buys this player its own buttons — is in the settings
			 * beside it, and the frame's own note says so.
			 */
			const pagePlayButton = computed(
				() => pagePlayable() && !pageFrame()
			);

			return {
				now,
				sides,
				/** The record on show has sides, so it can be turned over. */
				hasSides: computed(() => sides().size > 0),
				/**
				 * The pictures of the track on show, in the order they were
				 * put there. The stage plays them through behind the words;
				 * an empty list is what sends it back to the blurred cover.
				 *
				 * They come off the track the player is already holding, so
				 * a song changing costs no read — only a lookup.
				 */
				trackPhotos: computed((): TrackImage[] => {
					const { request, trackId } = shown();
					const track = request?.tracks.find(
						(item) => item.id === trackId
					);

					return track?.images ?? [];
				}),
				/**
				 * The moving clip written from the song's lyrics, when it
				 * has one. The stage prefers it to the slideshow: it comes
				 * from the same words the pictures were drawn from, and it
				 * moves.
				 */
				trackClip: computed((): TrackClip | null => {
					const { request, trackId } = shown();
					const track = request?.tracks.find(
						(item) => item.id === trackId
					);

					return track?.clip ?? null;
				}),
				pageActive,
				/** The page's album / track plays now. */
				pagePlaying: computed(
					() =>
						(pageActive() && !!now()?.playing) ||
						(embedDrives(store.page()) && embed.playing())
				),
				pagePlayable,
				pagePlayButton,
				pageFrame,
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
				/**
				 * The source's last error, e.g. a missing Premium account or
				 * a YouTube player nothing here can reach. A blocked YouTube
				 * leaves no source at all, so it is said whenever the page
				 * has nothing better to report.
				 */
				error: computed(() =>
					(now()?.source ?? sourceFor(shown().request)) === 'spotify'
						? (spotify.error() ?? embed.error())
						: youtube.error()
				),
				sourceFor: computed(() => sourceFor),
				/** Which sources a record could be played on at all. */
				availableFor: computed(() => availableFor),
				/** The source the page plays on (what plays, when it is the page's). */
				pageSource: computed(() =>
					pageActive() ? now()!.source : sourceFor(store.page())
				),
				pageYoutubeAlbum: computed(() => {
					const page = store.page();
					return page ? youtubeAlbumOf(page) : null;
				}),
			};
		}
	),
	withPlayerSpotifyAccount(),
	withMethods(
		(
			store,
			trackDetailsEffect = inject(TrackDetailsEffect),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			albumStateService = inject(AlbumStateService),
			spotify = inject(SpotifyPlaybackStore),
			embed = inject(SpotifyEmbedStore),
			youtube = inject(YoutubePlaybackStore)
		) => {
			/**
			 * Plays the request from its track (or the album's start), on the
			 * source asked for where the record has one — a card offers a
			 * button per source, and each plays what its colour promises.
			 */
			const start = async (
				request: PlayRequest,
				on?: PlayerSource
			): Promise<void> => {
				// Without leave there is no source at all, whoever asked.
				const settled = store.sourceFor()(request);
				if (!settled) {
					return;
				}
				const source =
					on && store.availableFor()(request)[on] ? on : settled;
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

				if (source === 'spotify') {
					const playable = onSpotify(request);

					if (playable?.kind === 'album') {
						if (request.trackId) {
							await spotify.loadAlbumTracks(
								playable.id,
								request.tracks
							);
						}
						await spotify.play(
							playable.id,
							request.trackId,
							!settings.autoAdvance
						);
					} else if (playable) {
						// Only the song is Spotify's, so there is no record
						// to play it from and nothing can come after it —
						// autoAdvance has nowhere to advance to.
						await spotify.playTrack(playable.id);
					}
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
			const playAlbumById = async (
				albumId: string,
				on?: PlayerSource
			): Promise<void> => {
				patchState(store, {
					loadingAlbumId: albumId,
					loadingSource: on ?? null,
				});
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

					await start(albumPlayRequest(album, tracks), on);
				} catch (error) {
					console.error(error);
				} finally {
					patchState(store, {
						loadingAlbumId: null,
						loadingSource: null,
					});
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

				/**
				 * Plays an album of the catalog from its start, without the
				 * tap's `activate` — for the queue, whose own methods have
				 * already called it.
				 */
				_playAlbumById: playAlbumById,

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

				/**
				 * Plays an album of the catalog from its start, on the source
				 * asked for. A card offers one button per source the record
				 * has, so the button that was pressed decides — not the
				 * settings, which cannot know which colour was under the
				 * finger.
				 */
				playAlbum(albumId: string, on?: PlayerSource): Promise<void> {
					activate();

					return playAlbumById(albumId, on);
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
						return runningPositionMs(
							{
								playing: youtube.playing(),
								positionMs: youtube.positionMs(),
								positionAt: youtube.positionAt(),
								durationMs: youtube.durationMs(),
							},
							now
						);
					}
					if (store.embedDrives()(store.shown().request)) {
						// The frame reports where it is now and then; the
						// seconds in between are counted here, as they are
						// for the sources this player drives itself.
						return runningPositionMs(
							{
								playing: embed.playing(),
								positionMs: embed.positionMs(),
								positionAt: embed.positionAt(),
								durationMs: embed.durationMs(),
							},
							now
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

				openStage(): void {
					patchState(store, { stageOpen: true });
				},

				closeStage(): void {
					patchState(store, { stageOpen: false });
				},

				/**
				 * The question about the record that just finished is done
				 * with — answered, or sent away. Either way it is not asked
				 * again for that sitting.
				 */
				clearFinished(): void {
					patchState(store, { finished: null });
				},

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
	withFeature((store) =>
		withPlayerQueue({
			session: store.session,
			albums: store._albums,
			playersAllowed: store.playersAllowed,
			playableAlbumIds: store.playableAlbumIds,
			activate: store.activate,
			playAlbumById: store._playAlbumById,
		})
	),
	withFeature((store) =>
		withPlayerSettings(() => store.shown().request?.context ?? 'default')
	),
	withHooks({
		onInit(
			store,
			spotify = inject(SpotifyPlaybackStore),
			embed = inject(SpotifyEmbedStore),
			youtube = inject(YoutubePlaybackStore),
			playLog = inject(PlayLogEffect),
			document = inject(DOCUMENT),
			destroyRef = inject(DestroyRef)
		) {
			store.loadSettings(of(undefined));
			store.loadShuffled(of(undefined));
			store.loadLyrics(() => store.shown().trackId);

			// A pause is silent too, and nothing is wrong with that. Only
			// the quiet that lasts while the music plays is worth a word,
			// so every start wipes the slate.
			effect(() => {
				if (store.playing()) {
					untracked(() => store.audioSilent.set(false));
				}
			});

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
			const sittings = new SittingLog();
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
				const done = sittings.take(end, Date.now());

				if (!done) {
					return;
				}
				const { entry } = done;

				if (playLog.recording) {
					playLog
						.record(entry)
						.catch((error) =>
							console.error('Listening not logged', error)
						);
				}

				// A record heard right through, and over: the one moment a
				// collector has an opinion ready and nothing else to do with
				// it. Mid-sitting flushes are left alone — the question would
				// arrive over the last track rather than after it.
				if (end && entry.completed && playLog.recording) {
					patchState(store, {
						finished: {
							albumId: entry.albumId,
							albumTitle: entry.albumTitle,
							artistName: entry.artistName,
							artistId: done.artistId,
						},
					});
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

			/** What is being listened to, this player's doing or not. */
			const listening = computed(() => {
				const page = store.page();

				return listeningTo(store.now(), store.session(), page, {
					drives: store.embedDrives()(page),
					playing: embed.playing(),
				});
			});

			// What is playing, as the log follows it, and where the queue
			// takes over once a record has run out.
			effect(() => {
				const heard = listening();
				const at = Date.now();

				untracked(() => {
					const albumId = heard?.request.albumId ?? null;

					if (sittings.isWithOther(albumId)) {
						// Another record went on, or the player fell silent.
						played = false;
						sittings.pause(at);
						flush(true);
					}
					if (!heard || !albumId) {
						return;
					}
					sittings.hear(heard, at);

					if (heard.playing) {
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
