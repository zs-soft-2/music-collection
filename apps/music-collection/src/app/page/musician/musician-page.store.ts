import { Observable, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
	ContributionEntity,
	MembershipEntity,
	MusicianEntity,
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

import { MusicianProfileEffect } from '../../data/musician-profile';
import {
	AlbumView,
	ArtistView,
	ReleaseView,
	toAlbumView,
	toArtistView,
	toReleaseView,
} from '../../shared/music-ui';
import {
	AlbumRoleFilter,
	albumRoleCounts,
	toBandmates,
	toMusicianAlbums,
	toMusicianBands,
	toMusicianHeader,
	toMusicianSummary,
} from './musician.mapper';

interface MusicianPageState {
	musicianId: string | null;
	musician: MusicianEntity | null;
	memberships: MembershipEntity[];
	contributions: ContributionEntity[];
	profileLoading: boolean;
	/** Line-ups of the musician's bands, for the bandmates. */
	lineups: MembershipEntity[][];
	albums: AlbumView[];
	releases: ReleaseView[];
	artists: ArtistView[];
	albumsLoading: boolean;
	/** Selected credit category of the album list. */
	albumRole: AlbumRoleFilter;
}

const initialState: MusicianPageState = {
	musicianId: null,
	musician: null,
	memberships: [],
	contributions: [],
	profileLoading: true,
	lineups: [],
	albums: [],
	releases: [],
	artists: [],
	albumsLoading: true,
	albumRole: 'all',
};

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

export const MusicianPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const currentYear = new Date().getFullYear();

		const albums = computed(() =>
			toMusicianAlbums(
				store.contributions(),
				store.albums(),
				store.releases()
			)
		);

		const bands = computed(() =>
			toMusicianBands(
				store.memberships(),
				store.artists(),
				store.releases(),
				currentYear
			)
		);

		return {
			header: computed(() =>
				toMusicianHeader(
					store.musicianId() ?? '',
					store.musician(),
					store.memberships(),
					store.contributions()
				)
			),
			summary: computed(() =>
				toMusicianSummary(
					store.memberships(),
					store.contributions(),
					currentYear
				)
			),
			members: computed(() =>
				bands().filter((band) => band.kind === 'member')
			),
			guestBands: computed(() =>
				bands().filter((band) => band.kind === 'guest')
			),
			albums,
			albumRoles: computed(() => albumRoleCounts(albums())),
			filteredAlbums: computed(() => {
				const role = store.albumRole();

				return role === 'all'
					? albums()
					: albums().filter((album) =>
							album.categories.includes(role)
						);
			}),
			collectedAlbums: computed(
				() =>
					albums().filter((album) => album.ownedFormats.length).length
			),
			bandmates: computed(() =>
				toBandmates(
					store.musicianId() ?? '',
					store.memberships(),
					store.lineups(),
					currentYear
				)
			),
			/** Nothing is known about the musician (once loaded). */
			notFound: computed(
				() =>
					!store.profileLoading() &&
					!store.musician() &&
					!store.memberships().length &&
					!store.contributions().length
			),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			musicianProfileEffect = inject(MusicianProfileEffect),
			albumStateService = inject(AlbumStateService),
			artistStateService = inject(ArtistStateService),
			collectionItemStateService = inject(CollectionItemStateService)
		) => ({
			/** Follows the `:musicianId` route parameter. */
			loadProfile: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('musicianId') ?? ''),
					tap((musicianId) =>
						patchState(store, {
							musicianId,
							musician: null,
							memberships: [],
							contributions: [],
							lineups: [],
							profileLoading: true,
							albumRole: 'all',
						})
					),
					switchMap((musicianId) =>
						musicianProfileEffect.load$(musicianId).pipe(
							tapResponse({
								next: (profile) =>
									patchState(store, {
										...profile,
										profileLoading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										profileLoading: false,
									});
								},
							})
						)
					)
				)
			),
			/** Line-ups of the bands the musician was a member of. */
			loadLineups: rxMethod<string[]>(
				pipe(
					switchMap((artistUids) =>
						musicianProfileEffect.loadLineups$(artistUids).pipe(
							tapResponse({
								next: (lineups) =>
									patchState(store, { lineups }),
								error: (error) => console.error(error),
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
							patchState(store, {
								albums: albums.map(toAlbumView),
								albumsLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { albumsLoading: false });
						},
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
							}),
						error: (error) => console.error(error),
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
			setAlbumRole: (albumRole: AlbumRoleFilter) =>
				patchState(store, { albumRole }),
		})
	),
	withHooks({
		onInit(store) {
			store.loadProfile(of(undefined));
			store.loadLineups(
				computed(() => [
					...new Set(
						store
							.memberships()
							.filter(
								(membership) => membership.kind === 'member'
							)
							.map((membership) => membership.artistUid)
					),
				])
			);
			store.loadAlbums(of(undefined));
			store.loadReleases(of(undefined));
			store.loadArtists(of(undefined));
		},
	})
);
