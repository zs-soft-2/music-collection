import {
	Observable,
	combineLatest,
	filter,
	map,
	of,
	pairwise,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { DestroyRef, computed, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistStateService,
	AuthenticationStateService,
	CollectionItemEntityAdd,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	ContributionEntity,
	EntityTypeEnum,
	ReleaseEntity,
	ReleaseStateService,
	RoleNames,
	TrackEntity,
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
import { NgxPermissionsService } from 'ngx-permissions';

import { AlbumDetailsEffect } from '../../data/album-details';
import {
	ArtistView,
	ReleaseView,
	toArtistView,
	toDiscography,
	toReleaseView,
} from '../../shared/music-ui';
import {
	groupCredits,
	groupTracks,
	toAlbumProfile,
	toReleaseOptions,
	totalDuration,
} from './album.mapper';
import {
	PlayRequest,
	PlayerStore,
	albumPlayRequest,
} from '../../shared/player';

interface AlbumPageState {
	albumId: string | null;
	albums: AlbumEntity[];
	artists: ArtistView[];
	releases: ReleaseView[];
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
	/** Every release of the catalog; loaded when the picker first opens. */
	catalogReleases: ReleaseEntity[];
	catalogReleasesLoading: boolean;
	/** The signed-in user, who may add to their collection. */
	userId: string | null;
	canCollect: boolean;
	pickerOpen: boolean;
	adding: boolean;
	addError: string | null;
	albumsLoading: boolean;
	releasesLoading: boolean;
	detailsLoading: boolean;
	detailsFailed: boolean;
}

const initialState: AlbumPageState = {
	albumId: null,
	albums: [],
	artists: [],
	releases: [],
	tracks: [],
	contributions: [],
	catalogReleases: [],
	catalogReleasesLoading: true,
	userId: null,
	canCollect: false,
	pickerOpen: false,
	adding: false,
	addError: null,
	albumsLoading: true,
	releasesLoading: true,
	detailsLoading: true,
	detailsFailed: false,
};

const MORE_ALBUMS_COUNT = 6;

/** Selects a feature's entities and requests the list while it is empty. */
function entities$<T>(
	select: () => Observable<T[]>,
	dispatchList: () => void
): Observable<T[]> {
	return select().pipe(
		tap((items) => {
			if (!items?.length) {
				dispatchList();
			}
		}),
		filter((items) => items?.length > 0)
	);
}

export const AlbumPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const albumEntity = computed(
			() =>
				store.albums().find((album) => album.uid === store.albumId()) ??
				null
		);
		const album = computed(() => {
			const entity = albumEntity();
			return entity ? toAlbumProfile(entity) : null;
		});

		return {
			album,
			artist: computed(
				() =>
					store
						.artists()
						.find((artist) => artist.id === album()?.artistId) ??
					null
			),
			/** The collector's copies of this album. */
			copies: computed(() =>
				store
					.releases()
					.filter((release) => release.albumId === store.albumId())
			),
			/** The album's catalog releases to pick the collected one from. */
			releaseOptions: computed(() => {
				const albumId = store.albumId();
				const owned = new Set(
					store
						.releases()
						.filter((release) => release.albumId === albumId)
						.flatMap((release) =>
							release.releaseId ? [release.releaseId] : []
						)
				);

				return toReleaseOptions(
					store
						.catalogReleases()
						.filter((release) => release.album?.uid === albumId),
					owned
				);
			}),
			trackGroups: computed(() =>
				groupTracks(store.tracks(), store.contributions())
			),
			totalDuration: computed(() => totalDuration(store.tracks())),
			creditGroups: computed(() => groupCredits(store.contributions())),
			/** Other albums of the same artist, nearest release years first. */
			moreAlbums: computed(() => {
				const current = album();
				if (!current) {
					return [];
				}
				const others = store
					.albums()
					.filter(
						(other) =>
							other.artist?.uid === current.artistId &&
							other.uid !== current.id
					)
					.map((other) => toAlbumProfile(other));

				return toDiscography(others, store.releases())
					.sort(
						(a, b) =>
							Math.abs((a.year ?? 0) - (current.year ?? 0)) -
							Math.abs((b.year ?? 0) - (current.year ?? 0))
					)
					.slice(0, MORE_ALBUMS_COUNT)
					.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
			}),
			notFound: computed(
				() =>
					!store.albumsLoading() &&
					!albumEntity() &&
					store.albums().length > 0
			),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			albumStateService = inject(AlbumStateService),
			artistStateService = inject(ArtistStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			releaseStateService = inject(ReleaseStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService),
			albumDetailsEffect = inject(AlbumDetailsEffect)
		) => ({
			/** Follows `:albumId` and loads the tracklist and credits. */
			loadDetails: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('albumId') ?? ''),
					tap((albumId) =>
						patchState(store, {
							albumId,
							tracks: [],
							contributions: [],
							detailsLoading: true,
							detailsFailed: false,
						})
					),
					switchMap((albumId) =>
						albumDetailsEffect.load$(albumId).pipe(
							tapResponse({
								next: ({ tracks, contributions }) =>
									patchState(store, {
										tracks,
										contributions,
										detailsLoading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										detailsLoading: false,
										detailsFailed: true,
									});
								},
							})
						)
					)
				)
			),
			loadAlbums: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => albumStateService.selectEntities$(),
							() => albumStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (albums) =>
							patchState(store, { albums, albumsLoading: false }),
						error: (error) => {
							console.error(error);
							patchState(store, { albumsLoading: false });
						},
					})
				)
			),
			loadArtists: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => artistStateService.selectEntities$(),
							() =>
								artistStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (artists) =>
							patchState(store, {
								artists: artists.map(toArtistView),
							}),
						error: (error) => console.error(error),
					})
				)
			),
			/** Who is signed in and whether they may add to their collection. */
			loadCollector: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							authenticationStateService.selectAuthenticatedUser$(),
							permissionsService.permissions$,
						])
					),
					tap(([user, permissions]) =>
						patchState(store, {
							userId: user?.uid ?? null,
							canCollect:
								!!user?.uid &&
								(CollectionItemPermissionsService.createCollectionItemEntity in
									permissions ||
									RoleNames.ADMIN in permissions),
						})
					)
				)
			),
			loadCatalogReleases: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => releaseStateService.selectEntities$(),
							() =>
								releaseStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (catalogReleases) =>
							patchState(store, {
								catalogReleases,
								catalogReleasesLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								catalogReleasesLoading: false,
							});
						},
					})
				)
			),
			/** Follows the add; the picker closes once the copy is saved. */
			watchAdding: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							collectionItemStateService.selectAdding$(),
							collectionItemStateService.selectError$(),
						])
					),
					pairwise(),
					tap(([[wasAdding], [adding, error]]) => {
						patchState(store, { adding });
						if (wasAdding && !adding) {
							patchState(store, {
								addError: error,
								pickerOpen: !!error,
							});
						}
					})
				)
			),
			/** Adds a copy of the release to the signed-in user's collection. */
			addToCollection(releaseId: string): void {
				const release = store
					.catalogReleases()
					.find((item) => item.uid === releaseId);
				const userId = store.userId();

				if (!release || !userId || store.adding()) {
					return;
				}

				const collectionItem: CollectionItemEntityAdd = {
					entityType: EntityTypeEnum.CollectionItem,
					date: new Date(),
					release,
					userId,
				};

				patchState(store, { addError: null });
				collectionItemStateService.dispatchAddEntityAction(
					collectionItem
				);
			},
			loadReleases: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => collectionItemStateService.selectEntities$(),
							() =>
								collectionItemStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (items) =>
							patchState(store, {
								releases: items.map(toReleaseView),
								releasesLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { releasesLoading: false });
						},
					})
				)
			),
		})
	),
	withMethods((store) => {
		let catalogRequested = false;

		return {
			openPicker(): void {
				if (!catalogRequested) {
					catalogRequested = true;
					store.loadCatalogReleases(of(undefined));
				}
				patchState(store, { pickerOpen: true, addError: null });
			},
			closePicker(): void {
				patchState(store, { pickerOpen: false });
			},
		};
	}),
	withComputed((store, player = inject(PlayerStore)) => ({
		/** Our id of the album's track playing now. */
		playingTrackId: computed(() => {
			const now = player.now();
			return now?.albumId === store.albumId() ? now.trackId : null;
		}),
		/** The album plays now. */
		playing: computed(() => player.pagePlaying()),
		playable: computed(() => player.pagePlayable()),
	})),
	withMethods((store, player = inject(PlayerStore)) => ({
		/** Plays the album, or pauses / resumes it. */
		togglePlay(): Promise<void> {
			return player.togglePage();
		},
		playTrack(trackId: string): Promise<void> {
			return player.playPageTrack(trackId);
		},
		openPlayer(): void {
			player.openStage();
		},
	})),
	withHooks({
		onInit(store, player = inject(PlayerStore)) {
			// The player gets ready for the album shown.
			let page: PlayRequest | null = null;
			effect(() => {
				const album = store
					.albums()
					.find((item) => item.uid === store.albumId());
				page = album ? albumPlayRequest(album, store.tracks()) : null;
				player.setPage(page);
			});
			inject(DestroyRef).onDestroy(() => player.clearPage(page));

			store.loadDetails(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadArtists(of(undefined));
			store.loadReleases(of(undefined));
			store.loadCollector(of(undefined));
			store.watchAdding(of(undefined));
		},
	})
);
