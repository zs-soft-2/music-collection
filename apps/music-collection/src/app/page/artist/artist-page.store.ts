import { Observable, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	CollectionItemStateService,
	MembershipEntity,
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

import { ArtistLineupEffect } from '../../data/artist-lineup';
import {
	AlbumView,
	ArtistView,
	FORMAT_ORDER,
	ReleaseView,
	toAlbumView,
	toArtistView,
	toDiscography,
	toReleaseView,
} from '../../shared/music-ui';
import { Crumb } from '../../shared/page-breadcrumb';
import {
	ArtistProfileView,
	albumTypeCounts,
	similarArtists,
	toArtistProfile,
	toLineup,
} from './artist.mapper';

interface ArtistPageState {
	artistId: string | null;
	artist: ArtistProfileView | null;
	/** The whole catalog; the artist's albums are derived from it. */
	albums: (AlbumView & { artistId: string })[];
	releases: ReleaseView[];
	artists: ArtistView[];
	artistLoading: boolean;
	albumsLoading: boolean;
	releasesLoading: boolean;
	/** Selected album type filter of the discography; null = all. */
	albumType: string | null;
	memberships: MembershipEntity[];
	lineupLoading: boolean;
}

const initialState: ArtistPageState = {
	artistId: null,
	artist: null,
	albums: [],
	releases: [],
	artists: [],
	artistLoading: true,
	albumsLoading: true,
	releasesLoading: true,
	albumType: null,
	memberships: [],
	lineupLoading: true,
};

const SIMILAR_COUNT = 6;

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

export const ArtistPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		/** The collection's releases of this artist. */
		const ownReleases = computed(() =>
			store
				.releases()
				.filter((release) => release.artistId === store.artistId())
				.sort(
					(a, b) =>
						(a.year ?? Number.MAX_SAFE_INTEGER) -
						(b.year ?? Number.MAX_SAFE_INTEGER)
				)
		);

		const discography = computed(() =>
			toDiscography(
				store
					.albums()
					.filter((album) => album.artistId === store.artistId()),
				ownReleases()
			)
		);

		const releaseCounts = computed(() => {
			const counts = new Map<string, number>();

			for (const release of store.releases()) {
				counts.set(
					release.artistId,
					(counts.get(release.artistId) ?? 0) + 1
				);
			}
			return counts;
		});

		return {
			/** My Collection › this artist. */
			trail: computed<Crumb[]>(() => {
				const name = store.artist()?.name;

				return [
					{ label: 'My Collection', link: '/collection' },
					...(name ? [{ label: name }] : []),
				];
			}),
			ownReleases,
			discography,
			albumTypes: computed(() => albumTypeCounts(discography())),
			filteredDiscography: computed(() => {
				const type = store.albumType();

				return type
					? discography().filter(
							(album) => (album.albumType ?? 'Other') === type
						)
					: discography();
			}),
			stats: computed(() => {
				const years = discography()
					.map((album) => album.year)
					.filter((year): year is number => year !== null);

				return {
					albums: discography().length,
					collectedAlbums: discography().filter(
						(album) => album.ownedFormats.length
					).length,
					releases: ownReleases().length,
					formats: FORMAT_ORDER.map((format) => ({
						format,
						count: ownReleases().filter(
							(release) => release.format === format
						).length,
					})).filter((entry) => entry.count > 0),
					firstYear: years.length ? Math.min(...years) : null,
					lastYear: years.length ? Math.max(...years) : null,
				};
			}),
			similar: computed(() => {
				const artist = store.artist();

				return artist
					? similarArtists(
							artist,
							store.artists(),
							releaseCounts(),
							SIMILAR_COUNT
						)
					: [];
			}),
			/** The artist is not in the catalog (only known once all are loaded). */
			lineup: computed(() =>
				toLineup(store.memberships(), new Date().getFullYear())
			),
			notFound: computed(
				() =>
					!store.artist() &&
					store.artists().length > 0 &&
					!store
						.artists()
						.some((artist) => artist.id === store.artistId())
			),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			artistLineupEffect = inject(ArtistLineupEffect),
			artistStateService = inject(ArtistStateService),
			albumStateService = inject(AlbumStateService),
			collectionItemStateService = inject(CollectionItemStateService)
		) => ({
			/** Follows the `:artistId` route parameter. */
			loadArtist: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('artistId') ?? ''),
					// The artist comes from the full artist list (loadArtists), which
					// the similar-artists section needs anyway.
					tap((artistId) =>
						patchState(store, {
							artistId,
							artist: null,
							albumType: null,
							artistLoading: true,
						})
					),
					switchMap((artistId) =>
						artistStateService.selectEntityById$(artistId).pipe(
							filter(
								(artist): artist is ArtistEntity => !!artist
							),
							map(toArtistProfile)
						)
					),
					tapResponse({
						next: (artist) =>
							patchState(store, { artist, artistLoading: false }),
						error: (error) => {
							console.error(error);
							patchState(store, { artistLoading: false });
						},
					})
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
								albums: albums.map((album) => ({
									...toAlbumView(album),
									artistId: album.artist?.uid ?? '',
								})),
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
						collectionItemStateService.selectLoadedEntities$()
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
			/** Follows `:artistId` and loads the band's line-up. */
			loadLineup: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('artistId') ?? ''),
					tap(() =>
						patchState(store, {
							memberships: [],
							lineupLoading: true,
						})
					),
					switchMap((artistId) =>
						artistLineupEffect.load$(artistId).pipe(
							tapResponse({
								next: (memberships) =>
									patchState(store, {
										memberships,
										lineupLoading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, { lineupLoading: false });
								},
							})
						)
					)
				)
			),
			setAlbumType: (albumType: string | null) =>
				patchState(store, { albumType }),
		})
	),
	withHooks({
		onInit(store) {
			store.loadArtist(of(undefined));
			store.loadLineup(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadReleases(of(undefined));
			store.loadArtists(of(undefined));
		},
	})
);
