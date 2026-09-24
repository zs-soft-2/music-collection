import { NgxPermissionsService } from 'ngx-permissions';
import { filter, firstValueFrom, map, of, pipe, switchMap, tap } from 'rxjs';

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
import { Crumb } from '../../shared/page-breadcrumb';
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
				 * Where the album was opened from › the album › this track: the
				 * collection it was picked out of when it was, My Collection ›
				 * the artist otherwise.
				 */
				trail: computed<Crumb[]>(() => {
					const profile = album();
					const name = track()?.name;
					const origin = store.originTrail();
					const originSlug = store.originSlug();

					return [
						...(origin.length
							? origin
							: [
									{
										label: text.translator()(
											'nav.collection'
										),
										link: '/collection',
									},
									...(profile?.artistId
										? [
												{
													label: profile.artistName,
													link: [
														'/artist',
														profile.artistId,
													],
												},
											]
										: []),
								]),
						...(profile
							? [
									{
										label: profile.title,
										link: ['/album', profile.id],
										// The album is read where the track was.
										queryParams:
											collectionOriginParams(originSlug),
									},
								]
							: []),
						...(name ? [{ label: name }] : []),
					];
				}),
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
			/** Plays the track, or pauses / resumes it. */
			togglePlay(): Promise<void> {
				return player.togglePage();
			},

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
		/** The player is on this track. */
		playing: computed(() => player.pagePlaying()),
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
		},
	})
);
