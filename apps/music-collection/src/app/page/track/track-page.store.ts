import { NgxPermissionsService } from 'ngx-permissions';
import {
	EMPTY,
	distinctUntilChanged,
	filter,
	firstValueFrom,
	from,
	map,
	of,
	pipe,
	switchMap,
	tap,
	timer,
} from 'rxjs';

import { DestroyRef, computed, effect, inject } from '@angular/core';
import { TextService } from '@music-collection/core/i18n';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ContributionEntity,
	RoleNames,
	TrackEntity,
	type TrackClip,
	type TrackClipEstimate,
	type TrackClipState,
	type TrackClipStatus,
	type TrackImage,
	type TrackImageModel,
	TrackLyrics,
	isSpotifyTrackId,
	isYoutubeVideoId,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { AlbumDetailsEffect } from '../../data/album-details';
import {
	TrackDetailsEffect,
	TrackDetailsUpdate,
} from '../../data/track-details';
import { MAX_TRACK_IMAGES, TrackImageEffect } from '../../data/track-image';
import { CLIP_POLL_MS, TrackMediaEffect } from '../../data/track-media';
import { Crumb, pageTrail } from '../../shared/page-breadcrumb';
import {
	collectionOriginParams,
	withPageOrigin,
} from '../../shared/page-origin';
import { PlayRequest, PlayerStore, toTrackToMatch } from '../../shared/player';
import { toAlbumProfile } from '../album/album.mapper';
import { toTrackCredits } from './track.mapper';

const UPDATE_PERMISSION = 'updateTrackEntity';

interface TrackPageState {
	albumId: string | null;
	trackId: string | null;
	albums: AlbumEntity[];
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
	lyrics: TrackLyrics | null;
	loading: boolean;
	failed: boolean;
	saving: boolean;
	saveError: string | null;
	fetchingLyrics: boolean;
	fetchLyricsError: string | null;
	/** A picture is being scaled, uploaded or written. */
	storingImage: boolean;
	/**
	 * A model is drawing a picture right now. Told apart from the storing
	 * above because the waits are nothing alike: an upload is a moment, a
	 * drawing is half a minute of a call nobody can see. The page has to say
	 * which of the two the editor is waiting for.
	 */
	drawingImage: boolean;
	imageError: string | null;
	/**
	 * Where the song's generated clip stands. It comes from the server —
	 * the work runs at the gateway, not in this browser — so a page that is
	 * opened while a clip is being made finds it already under way.
	 */
	clipStatus: TrackClipStatus;
	clipError: string | null;
	clipPrompt: string | null;
	clipEstimate: TrackClipEstimate | null;
	/** A clip call is in flight (the price, the start, the asking). */
	clipBusy: boolean;
	clipRemainingToday: number | null;
	/** The models the gateway would let this tenant draw with. */
	imageModels: TrackImageModel[];
	loadingModels: boolean;
}

const initialState: TrackPageState = {
	albumId: null,
	trackId: null,
	albums: [],
	tracks: [],
	contributions: [],
	lyrics: null,
	loading: true,
	failed: false,
	saving: false,
	saveError: null,
	fetchingLyrics: false,
	fetchLyricsError: null,
	storingImage: false,
	drawingImage: false,
	imageError: null,
	clipStatus: 'none',
	clipError: null,
	clipPrompt: null,
	clipEstimate: null,
	clipBusy: false,
	clipRemainingToday: null,
	imageModels: [],
	loadingModels: false,
};

export const TrackPageStore = signalStore(
	withState(initialState),
	withPageOrigin(),
	withComputed(
		(
			store,
			permissions = inject(NgxPermissionsService),
			text = inject(TextService)
		) => {
			const track = computed(
				() =>
					store
						.tracks()
						.find((item) => item.uid === store.trackId()) ?? null
			);
			const permissionNames = toSignal(
				permissions.permissions$.pipe(map((all) => Object.keys(all))),
				{ initialValue: [] as string[] }
			);

			const album = computed(() => {
				const entity = store
					.albums()
					.find((item) => item.uid === store.albumId());

				return entity ? toAlbumProfile(entity) : null;
			});

			return {
				track,
				album,
				/**
				 * The song's pictures, in the order they are shown. They
				 * come off the track document, which is followed live, so a
				 * picture added or dropped shows up without reloading.
				 */
				images: computed((): TrackImage[] => track()?.images ?? []),
				/** There is room for one more picture on this song. */
				canAddImage: computed(
					() => (track()?.images ?? []).length < MAX_TRACK_IMAGES
				),
				/**
				 * The finished clip, with the address it plays from. It is
				 * read off the track document rather than off the job, so it
				 * survives the job being forgotten.
				 */
				clip: computed((): TrackClip | null => track()?.clip ?? null),
				/**
				 * What the whole page is dressed in: the song's own first
				 * picture where it has one, the record's cover otherwise.
				 * The player's panel has no backdrop of its own, so this is
				 * also what stands behind the music while it plays here.
				 */
				pageBackdrop: computed(
					() =>
						track()?.images?.[0]?.filePath ??
						album()?.coverUrl ??
						null
				),
				/** A clip is being made for this song right now. */
				clipRunning: computed(
					() =>
						store.clipStatus() === 'queued' ||
						store.clipStatus() === 'running'
				),
				/**
				 * There are words a clip could be built from. The video
				 * model is only ever handed a prompt, and that prompt is
				 * written from the lyrics — the same source the song's
				 * pictures came from — so a song without lyrics has nothing
				 * to order a clip with.
				 */
				hasLyrics: computed(() => !!store.lyrics()?.text?.trim()),
				/**
				 * Home › the band › the album › this track. The track is part
				 * of the record whoever opened it and from wherever; the way back
				 * is the Back control's business.
				 */
				trail: computed<Crumb[]>(() => {
					const profile = album();
					const name = track()?.name;
					const originSlug = store.originSlug();

					return pageTrail(text.translator(), [
						profile?.artistId
							? {
									label: profile.artistName,
									link: ['/artist', profile.artistId],
								}
							: null,
						profile
							? {
									label: profile.title,
									link: ['/album', profile.id],
									// The album is read where the track was.
									queryParams:
										collectionOriginParams(originSlug),
								}
							: null,
						name ? { label: name } : null,
					]);
				}),
				/** The collection the record was opened from, for the way back. */
				backLabel: computed(() => store.originName()),
				spotifyTrackId: computed(() => {
					const id = track()?.spotifyTrackId;
					return isSpotifyTrackId(id) ? id : null;
				}),
				youtubeVideoId: computed(() => {
					const id = track()?.youtubeVideoId;
					return isYoutubeVideoId(id) ? id : null;
				}),
				credits: computed(() => {
					const current = track();
					return current
						? toTrackCredits(
								current,
								store.tracks(),
								store.contributions()
							)
						: [];
				}),
				/** Previous and next track of the album, in play order. */
				neighbours: computed(() => {
					const index = store
						.tracks()
						.findIndex((item) => item.uid === store.trackId());
					return {
						previous: index > 0 ? store.tracks()[index - 1] : null,
						next:
							index >= 0
								? (store.tracks()[index + 1] ?? null)
								: null,
					};
				}),
				canEdit: computed(() =>
					permissionNames().some(
						(name) =>
							name === UPDATE_PERMISSION ||
							name === RoleNames.ADMIN
					)
				),
				notFound: computed(
					() => !store.loading() && !store.failed() && !track()
				),
			};
		}
	),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			albumStateService = inject(AlbumStateService),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			trackDetailsEffect = inject(TrackDetailsEffect),
			trackImageEffect = inject(TrackImageEffect),
			trackMediaEffect = inject(TrackMediaEffect),
			player = inject(PlayerStore)
		) => ({
			/** Follows `:albumId` / `:trackId`. */
			loadTrack: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => ({
						albumId: params.get('albumId') ?? '',
						trackId: params.get('trackId') ?? '',
					})),
					tap(({ albumId, trackId }) =>
						patchState(store, {
							albumId,
							trackId,
							loading: store.albumId() !== albumId,
							failed: false,
							saveError: null,
						})
					),
					map(({ albumId }) => albumId),
					switchMap((albumId) =>
						albumDetailsEffect.load$(albumId).pipe(
							tapResponse({
								next: ({ tracks, contributions }) =>
									patchState(store, {
										tracks,
										contributions,
										loading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										loading: false,
										failed: true,
									});
								},
							})
						)
					)
				)
			),
			loadLyrics: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('trackId') ?? ''),
					tap(() => patchState(store, { lyrics: null })),
					switchMap((trackId) => trackDetailsEffect.lyrics$(trackId)),
					tap((lyrics) => patchState(store, { lyrics }))
				)
			),
			loadAlbums: rxMethod<void>(
				pipe(
					switchMap(() => albumStateService.selectEntities$()),
					tap((albums) => {
						if (!albums?.length) {
							albumStateService.dispatchListEntitiesAction();
						}
					}),
					filter((albums) => albums?.length > 0),
					tap((albums) => patchState(store, { albums }))
				)
			),
			/**
			 * Looks the lyrics up online for the edit form; the admin saves
			 * them. Resolves null when not found.
			 */
			async fetchExternalLyrics(): Promise<TrackLyrics | null> {
				const track = store.track();
				const album = store.album();
				if (!track || !album?.artistName || !store.canEdit()) {
					return null;
				}
				patchState(store, {
					fetchingLyrics: true,
					fetchLyricsError: null,
				});
				try {
					const lyrics = await firstValueFrom(
						trackDetailsEffect.fetchExternalLyrics$({
							artistName: album.artistName,
							trackName: track.name,
							albumName: album.title ?? null,
							durationSec: track.durationSec,
						})
					);
					patchState(store, {
						fetchingLyrics: false,
						fetchLyricsError: lyrics ? null : 'No lyrics found.',
					});
					return lyrics;
				} catch (error) {
					console.error(error);
					patchState(store, {
						fetchingLyrics: false,
						fetchLyricsError: 'Loading lyrics failed.',
					});
					return null;
				}
			},
			/**
			 * Scales the chosen file to WebP, stores it and writes it onto
			 * the track. The list written is the one the page is showing,
			 * which is the one the live listener last brought.
			 */
			async addImage(file: File): Promise<void> {
				const trackUid = store.trackId();

				if (!trackUid || !store.canEdit() || store.storingImage()) {
					return;
				}

				patchState(store, { storingImage: true, imageError: null });

				try {
					await trackImageEffect.add(
						trackUid,
						store.track()?.name ?? '',
						store.track()?.images ?? [],
						file
					);
					patchState(store, { storingImage: false });
				} catch (error) {
					console.error(error);
					patchState(store, {
						storingImage: false,
						imageError:
							error instanceof Error
								? error.message
								: 'A kép feltöltése nem sikerült.',
					});
				}
			},

			/** Drops one picture, and the file behind it. */
			async removeImage(index: number): Promise<void> {
				const trackUid = store.trackId();

				if (!trackUid || !store.canEdit() || store.storingImage()) {
					return;
				}

				patchState(store, { storingImage: true, imageError: null });

				try {
					await trackImageEffect.remove(
						trackUid,
						store.track()?.images ?? [],
						index
					);
					patchState(store, { storingImage: false });
				} catch (error) {
					console.error(error);
					patchState(store, {
						storingImage: false,
						imageError: 'A kép törlése nem sikerült.',
					});
				}
			},

			/** Moves one picture one place earlier or later in the order. */
			async moveImage(index: number, direction: -1 | 1): Promise<void> {
				const trackUid = store.trackId();

				if (!trackUid || !store.canEdit() || store.storingImage()) {
					return;
				}

				patchState(store, { storingImage: true, imageError: null });

				try {
					await trackImageEffect.move(
						trackUid,
						store.track()?.images ?? [],
						index,
						direction
					);
					patchState(store, { storingImage: false });
				} catch (error) {
					console.error(error);
					patchState(store, {
						storingImage: false,
						imageError: 'A sorrend mentése nem sikerült.',
					});
				}
			},

			/**
			 * The models this tenant may draw with. Asked of the gateway
			 * once the editor opens the panel, because entitlements change
			 * without this app being rebuilt — a list hard-coded here would
			 * offer models nobody can call.
			 */
			async loadImageModels(): Promise<void> {
				const trackUid = store.trackId();

				if (
					!trackUid ||
					!store.canEdit() ||
					store.loadingModels() ||
					store.imageModels().length
				) {
					return;
				}

				patchState(store, { loadingModels: true });

				try {
					const models = await trackMediaEffect.imageModels(trackUid);

					patchState(store, {
						loadingModels: false,
						imageModels: models,
					});
				} catch (error) {
					patchState(store, {
						loadingModels: false,
						imageError: clipMessage(
							error,
							'A modell-listát nem tudtuk lekérni.'
						),
					});
				}
			},

			/**
			 * Has a picture drawn for the song and puts it after the others.
			 * The server writes the prompt and files the document; `hint` is
			 * a short line of direction and nothing more.
			 */
			async drawImage(model: string | null, hint: string): Promise<void> {
				const trackUid = store.trackId();

				if (!trackUid || !store.canEdit() || store.storingImage()) {
					return;
				}

				patchState(store, {
					storingImage: true,
					drawingImage: true,
					imageError: null,
				});

				try {
					const drawn = await trackMediaEffect.drawImage(
						trackUid,
						model,
						hint
					);

					await trackImageEffect.append(
						trackUid,
						store.track()?.images ?? [],
						drawn
					);
					patchState(store, {
						storingImage: false,
						drawingImage: false,
					});
				} catch (error) {
					patchState(store, {
						storingImage: false,
						drawingImage: false,
						imageError: clipMessage(
							error,
							'A kép generálása nem sikerült.'
						),
					});
				}
			},

			/**
			 * What a clip would cost, and what is left of today's allowance.
			 * Asked for before the button is pressed, not after: the video
			 * model is the most expensive thing this app calls.
			 */
			async estimateClip(): Promise<void> {
				const trackUid = store.trackId();

				if (!trackUid || !store.canEdit() || store.clipBusy()) {
					return;
				}

				patchState(store, { clipBusy: true, clipError: null });

				try {
					const estimate =
						await trackMediaEffect.estimateClip(trackUid);

					patchState(store, {
						clipBusy: false,
						clipEstimate: estimate,
						clipRemainingToday: estimate.remainingToday,
					});
				} catch (error) {
					patchState(store, {
						clipBusy: false,
						clipError: clipMessage(
							error,
							'Az árat nem tudtuk megkérdezni.'
						),
					});
				}
			},

			/**
			 * Has a clip made of the song's words. Returns as soon as the
			 * gateway has taken the work on; the watcher below follows it to
			 * the end, and closing the page does not stop it.
			 */
			async generateClip(): Promise<void> {
				const trackUid = store.trackId();

				if (!trackUid || !store.canEdit() || store.clipBusy()) {
					return;
				}

				patchState(store, { clipBusy: true, clipError: null });

				try {
					const state = await trackMediaEffect.startClip(trackUid);

					patchState(store, { clipBusy: false, ...read(state) });
				} catch (error) {
					patchState(store, {
						clipBusy: false,
						clipError: clipMessage(
							error,
							'A videó-generálás nem indult el.'
						),
					});
				}
			},

			/**
			 * Where the clip got to. The same call files a finished clip, so
			 * this is also what finishes a job the page was away for.
			 */
			askClipState: rxMethod<string | null>(
				pipe(
					distinctUntilChanged(),
					switchMap((trackUid) =>
						trackUid
							? from(trackMediaEffect.clipState(trackUid))
							: EMPTY
					),
					tapResponse({
						next: (state) => patchState(store, read(state)),
						error: (error) => console.error(error),
					})
				)
			),

			/**
			 * While a clip is being made, asks again every so often. Driven
			 * by the state rather than by a timer of its own: when nothing is
			 * running, nothing is asked.
			 */
			watchClip: rxMethod<boolean>(
				pipe(
					switchMap((running) =>
						running ? timer(CLIP_POLL_MS, CLIP_POLL_MS) : EMPTY
					),
					switchMap(() => {
						const trackUid = store.trackId();

						return trackUid
							? from(trackMediaEffect.clipState(trackUid))
							: EMPTY;
					}),
					tapResponse({
						next: (state) => patchState(store, read(state)),
						error: (error) => console.error(error),
					})
				)
			),

			openPlayer(): void {
				player.openStage();
			},

			/** Resolves true when saved. */
			async save(update: TrackDetailsUpdate): Promise<boolean> {
				const trackId = store.trackId();
				if (!trackId || !store.canEdit()) {
					return false;
				}
				patchState(store, { saving: true, saveError: null });
				try {
					await trackDetailsEffect.save(
						trackId,
						update,
						store.lyrics()
					);
					patchState(store, { saving: false });
					return true;
				} catch (error) {
					console.error(error);
					patchState(store, {
						saving: false,
						saveError: 'Saving failed. Please try again.',
					});
					return false;
				}
			},
		})
	),
	withComputed((store, player = inject(PlayerStore)) => ({
		/** The page has a player to show at all. */
		playerAvailable: computed(() => player.pagePlayable()),
	})),
	withHooks({
		onInit(store, player = inject(PlayerStore)) {
			// The player gets ready for the track shown.
			let page: PlayRequest | null = null;
			effect(() => {
				const track = store.track();
				const album = store.album();
				page =
					track && album
						? {
								context: 'track',
								albumId: album.id,
								albumTitle: album.title,
								artistName: album.artistName ?? null,
								artistId: album.artistId ?? null,
								coverUrl: album.coverUrl ?? null,
								styles: album.styles,
								spotifyAlbumId: album.spotifyAlbumId,
								youtubePlaylistId: album.youtubePlaylistId,
								tracks: store.tracks().map(toTrackToMatch),
								trackId: track.uid,
								trackName: track.name,
								youtubeVideoId: store.youtubeVideoId(),
								spotifyTrackId: store.spotifyTrackId(),
								youtubeVideoIds: album.youtubeVideoIds,
							}
						: null;
				player.setPage(page);
			});
			inject(DestroyRef).onDestroy(() => player.clearPage(page));

			store.loadOrigin(of(undefined));
			store.loadTrack(of(undefined));
			store.loadLyrics(of(undefined));
			store.loadAlbums(of(undefined));
			// Only an editor may ask about a clip, and only a song with
			// lyrics can have one — both are known a moment after the page
			// opens, so the question waits for them rather than being asked
			// into the void.
			store.askClipState(() =>
				store.canEdit() && store.hasLyrics() ? store.trackId() : null
			);
			store.watchClip(() => store.clipRunning());
		},
	})
);

/** The clip fields of a state the server sent. */
function read(state: TrackClipState): {
	clipStatus: TrackClipStatus;
	clipError: string | null;
	clipPrompt: string | null;
	clipRemainingToday: number | null;
} {
	return {
		clipStatus: state.status,
		clipError: state.error,
		clipPrompt: state.prompt,
		clipRemainingToday: state.remainingToday,
	};
}

/**
 * What to show about a failed clip call. The callable's own message is
 * written for the person who pressed the button — the daily allowance, a song
 * with no pictures — so it is shown rather than swallowed, and the sentence
 * here is only for an error that never reached the function.
 */
function clipMessage(error: unknown, fallback: string): string {
	console.error(error);

	const message = (error as { message?: string } | null)?.message?.trim();

	return message || fallback;
}
