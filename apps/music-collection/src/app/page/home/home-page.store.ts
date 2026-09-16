import { Observable, filter, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
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

import {
	AlbumView,
	ArtistView,
	ReleaseView,
	toAlbumView,
	toArtistView,
	toReleaseView,
} from '../../shared/music-ui';
import {
	decadeDistribution,
	mostCollectedArtists,
	pickRandom,
	releaseCountsByArtist,
	topStyles,
} from './home.mapper';

interface HomePageState {
	artists: ArtistView[];
	albums: AlbumView[];
	releases: ReleaseView[];
	artistsLoading: boolean;
	albumsLoading: boolean;
	releasesLoading: boolean;
	spotlightId: string | null;
}

const initialState: HomePageState = {
	artists: [],
	albums: [],
	releases: [],
	artistsLoading: true,
	albumsLoading: true,
	releasesLoading: true,
	spotlightId: null,
};

const RECENT_COUNT = 6;
const ARTIST_COUNT = 12;
const ALBUM_COUNT = 12;
const STYLE_COUNT = 6;
const SPOTLIGHT_RELEASE_COUNT = 6;

/**
 * Loads a feature's entities once: selects them from the NgRx store and
 * triggers the list request when the store is still empty.
 */
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

export const HomePageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const counts = computed(() => releaseCountsByArtist(store.releases()));

		/** Spotlight candidates: collected artists with a header photo. */
		const spotlightCandidates = computed(() =>
			store
				.artists()
				.filter((artist) => artist.headerUrl && counts().has(artist.id))
		);

		const spotlight = computed(
			() =>
				store
					.artists()
					.find((artist) => artist.id === store.spotlightId()) ?? null
		);

		return {
			spotlightCandidates,
			spotlight,
			spotlightReleaseCount: computed(() => {
				const artist = spotlight();
				return artist ? (counts().get(artist.id) ?? 0) : 0;
			}),
			spotlightReleases: computed(() => {
				const artist = spotlight();

				return artist
					? store
							.releases()
							.filter((release) => release.artistId === artist.id)
							.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
							.slice(0, SPOTLIGHT_RELEASE_COUNT)
					: [];
			}),
			stats: computed(() => {
				const releases = store.releases();

				return {
					releases: releases.length,
					artists: counts().size,
					vinyl: releases.filter(
						(release) => release.format === 'vinyl'
					).length,
					cd: releases.filter((release) => release.format === 'cd')
						.length,
				};
			}),
			recentReleases: computed(() =>
				[...store.releases()]
					.sort((a, b) => b.addedAt - a.addedAt)
					.slice(0, RECENT_COUNT)
			),
			decades: computed(() => decadeDistribution(store.releases())),
			styles: computed(() => topStyles(store.releases(), STYLE_COUNT)),
			topArtists: computed(() =>
				mostCollectedArtists(store.artists(), counts(), ARTIST_COUNT)
			),
			newestAlbums: computed(() =>
				store
					.albums()
					.filter((album) => album.coverUrl)
					.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
					.slice(0, ALBUM_COUNT)
			),
		};
	}),
	withMethods(
		(
			store,
			artistStateService = inject(ArtistStateService),
			albumStateService = inject(AlbumStateService),
			collectionItemStateService = inject(CollectionItemStateService)
		) => {
			const ensureSpotlight = () => {
				if (!store.spotlightId()) {
					patchState(store, {
						spotlightId:
							pickRandom(store.spotlightCandidates())?.id ?? null,
					});
				}
			};

			return {
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
							next: (artists) => {
								patchState(store, {
									artists: artists.map(toArtistView),
									artistsLoading: false,
								});
								ensureSpotlight();
							},
							error: (error) => {
								console.error(error);
								patchState(store, { artistsLoading: false });
							},
						})
					)
				),
				loadAlbums: rxMethod<void>(
					pipe(
						switchMap(() =>
							entities$(
								() => albumStateService.selectEntities$(),
								() =>
									albumStateService.dispatchListEntitiesAction()
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
								() =>
									collectionItemStateService.selectEntities$(),
								() =>
									collectionItemStateService.dispatchListEntitiesAction()
							)
						),
						tapResponse({
							next: (items) => {
								patchState(store, {
									releases: items.map(toReleaseView),
									releasesLoading: false,
								});
								ensureSpotlight();
							},
							error: (error) => {
								console.error(error);
								patchState(store, { releasesLoading: false });
							},
						})
					)
				),
				/** Shows another artist in the spotlight. */
				shuffleSpotlight: () =>
					patchState(store, {
						spotlightId:
							pickRandom(
								store.spotlightCandidates(),
								store.spotlight() ?? undefined
							)?.id ?? null,
					}),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadArtists(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadReleases(of(undefined));
		},
	})
);
