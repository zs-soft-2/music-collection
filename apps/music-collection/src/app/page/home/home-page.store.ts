import {
	Observable,
	combineLatest,
	filter,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
	EntityCounts,
	EntityQuantityStateService,
} from '@music-collection/api';
import {
	MusicCollectionEffect,
	MusicCollectionStanding,
} from '@music-collection/domain/music-collection/core';
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
	sortCollectionCards,
	toCollectionCard,
} from '../collections/collections.mapper';
import { CollectionCardView } from '../collections/collections.model';
import {
	CATALOG_TYPES,
	catalogStats,
	decadeCoverage,
	mostCollectedArtists,
	pickRandom,
	releaseCountsByArtist,
	searchHome,
} from './home.mapper';

/** Collections on the home page; the rest is one click away. */
const HOME_COLLECTION_COUNT = 3;

interface HomePageState {
	artists: ArtistView[];
	albums: AlbumView[];
	releases: ReleaseView[];
	counts: EntityCounts;
	artistsLoading: boolean;
	albumsLoading: boolean;
	releasesLoading: boolean;
	countsLoading: boolean;
	/** The published collections with the collector's progress on them. */
	collectionStandings: MusicCollectionStanding[];
	collectionsLoading: boolean;
	spotlightId: string | null;
	query: string;
}

const initialState: HomePageState = {
	artists: [],
	albums: [],
	releases: [],
	counts: {},
	artistsLoading: true,
	albumsLoading: true,
	releasesLoading: true,
	countsLoading: true,
	collectionStandings: [],
	collectionsLoading: true,
	spotlightId: null,
	query: '',
};

const RECENT_COUNT = 6;
const ARTIST_COUNT = 12;
const ALBUM_COUNT = 12;
const SPOTLIGHT_RELEASE_COUNT = 6;
const SEARCH_RESULT_COUNT = 5;

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

		const collections = computed<CollectionCardView[]>(() =>
			sortCollectionCards(
				store.collectionStandings().map(toCollectionCard)
			)
		);

		return {
			/** The few worth showing: nearest to complete, empty ones never. */
			collections: computed(() =>
				collections()
					.filter((collection) => collection.total > 0)
					.slice(0, HOME_COLLECTION_COUNT)
			),
			completedCollections: computed(
				() =>
					collections().filter((collection) => collection.completed)
						.length
			),
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
			catalog: computed(() => catalogStats(store.counts())),
			coverage: computed(() =>
				decadeCoverage(store.albums(), store.releases())
			),
			recentReleases: computed(() =>
				[...store.releases()]
					.sort((a, b) => b.addedAt - a.addedAt)
					.slice(0, RECENT_COUNT)
			),
			topArtists: computed(() =>
				mostCollectedArtists(store.artists(), counts(), ARTIST_COUNT)
			),
			searchResults: computed(() =>
				searchHome(
					store.query(),
					store.artists(),
					store.releases(),
					store.albums(),
					SEARCH_RESULT_COUNT
				)
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
			collectionItemStateService = inject(CollectionItemStateService),
			quantityStateService = inject(EntityQuantityStateService),
			musicCollectionEffect = inject(MusicCollectionEffect)
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
				loadCollections: rxMethod<void>(
					pipe(
						switchMap(() => musicCollectionEffect.listStandings$()),
						tapResponse({
							next: (
								collectionStandings: MusicCollectionStanding[]
							) =>
								patchState(store, {
									collectionStandings,
									collectionsLoading: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, {
									collectionsLoading: false,
								});
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
							collectionItemStateService.selectLoadedEntities$()
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
				/** Live catalog-wide counts (artists, albums, tracks, …). */
				loadCounts: rxMethod<void>(
					pipe(
						tap(() =>
							quantityStateService.dispatchCountEntitiesAction(
								CATALOG_TYPES.map(({ type }) => type)
							)
						),
						switchMap(() =>
							combineLatest([
								quantityStateService.selectEntityCounts$(),
								quantityStateService.selectEntityCountsLoading$(),
							])
						),
						tapResponse({
							next: ([counts, countsLoading]) =>
								patchState(store, { counts, countsLoading }),
							error: (error) => {
								console.error(error);
								patchState(store, { countsLoading: false });
							},
						})
					)
				),
				setQuery: (query: string) => patchState(store, { query }),
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
			store.loadCounts(of(undefined));
			store.loadCollections(of(undefined));
		},
	})
);
