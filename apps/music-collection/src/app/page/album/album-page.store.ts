import { Observable, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
	ContributionEntity,
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
	totalDuration,
} from './album.mapper';

interface AlbumPageState {
	albumId: string | null;
	albums: AlbumEntity[];
	artists: ArtistView[];
	releases: ReleaseView[];
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
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
	withHooks({
		onInit(store) {
			store.loadDetails(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadArtists(of(undefined));
			store.loadReleases(of(undefined));
		},
	})
);
