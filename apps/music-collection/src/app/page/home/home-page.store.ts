import {
	Observable,
	combineLatest,
	debounceTime,
	distinctUntilChanged,
	filter,
	map,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { measure } from '@music-collection/common/engine';
import { TextService } from '@music-collection/core/i18n';
import {
	AlbumStateService,
	AnalyticsService,
	ArtistStateService,
	AuthenticationStateService,
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
	toNextAlbums,
} from '../collections/collections.mapper';
import {
	CollectionCardView,
	NextAlbumView,
} from '../collections/collections.model';
import {
	CATALOG_TYPES,
	albumCountsByArtist,
	albumsByDecade,
	albumsByStyle,
	artistsByType,
	catalogStats,
	decadeCoverage,
	mostCatalogedArtists,
	mostCollectedArtists,
	newInCatalog,
	pickRandom,
	releaseCountsByArtist,
	searchHome,
} from './home.mapper';

/** Collections on the home page; the rest is one click away. */
const HOME_COLLECTION_COUNT = 3;
/**
 * How many records the home page names to hunt for. Fewer than the hunt list
 * on `/collections`: this is a nudge on the way past, not the list itself.
 */
const HOME_HUNT_COUNT = 3;

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
	/** Signed in, as opposed to reading the catalog as a guest. */
	authenticated: boolean;
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
	authenticated: false,
};

const RECENT_COUNT = 6;
const ARTIST_COUNT = 12;
const ALBUM_COUNT = 12;
const SPOTLIGHT_RELEASE_COUNT = 6;
const SEARCH_RESULT_COUNT = 5;
/** How long a search box has to stand still before it counts as a search. */
const SEARCH_SETTLED_MS = 800;
/** Below this a term is still being typed, not searched with. */
const SEARCH_MIN_LENGTH = 2;
/** Rows of the catalog bands, and the covers or tiles shown in each. */
const GROUP_COUNT = 6;
const GROUP_ALBUM_COUNT = 12;
const GROUP_ARTIST_COUNT = 8;

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
	withComputed(
		(
			store,
			musicCollectionEffect = inject(MusicCollectionEffect),
			text = inject(TextService)
		) => {
			const counts = computed(() =>
				measure(
					'home.releaseCounts',
					{ releases: store.releases().length },
					() => releaseCountsByArtist(store.releases())
				)
			);

			const albumCounts = computed(() =>
				measure(
					'home.albumCounts',
					{ albums: store.albums().length },
					() => albumCountsByArtist(store.albums())
				)
			);

			/**
			 * The collection has arrived and there is none — a guest, or a
			 * collector who has not added a copy yet. The catalog is the content
			 * then: its artists are ranked by the albums it holds of them, and
			 * it stands in wherever the collection would have been shown.
			 */
			const catalogOnly = computed(
				() => !store.releasesLoading() && store.releases().length === 0
			);

			/** What the artists are ranked by: the collection, or the catalog. */
			const ranking = computed(() =>
				catalogOnly() ? albumCounts() : counts()
			);

			/** Spotlight candidates: ranked artists with a header photo. */
			const spotlightCandidates = computed(() =>
				store
					.artists()
					.filter(
						(artist) => artist.headerUrl && ranking().has(artist.id)
					)
			);

			const spotlight = computed(
				() =>
					store
						.artists()
						.find((artist) => artist.id === store.spotlightId()) ??
					null
			);

			const collections = computed<CollectionCardView[]>(() =>
				sortCollectionCards(
					store.collectionStandings().map(toCollectionCard)
				)
			);

			/**
			 * Which records to buy next. The standings are already in state to
			 * draw the collection rows, so ranking them costs a pass over what is
			 * in hand — no query, and nothing kept.
			 */
			const nextAlbums = computed<NextAlbumView[]>(() => {
				const cards = collections();

				// The hunt is about a shelf, and a guest has none: nothing is
				// ranked until there is something to continue.
				if (!cards.some((collection) => collection.owned > 0)) {
					return [];
				}

				return toNextAlbums(
					musicCollectionEffect.suggestNextAlbums(
						store.collectionStandings()
					),
					cards,
					HOME_HUNT_COUNT
				);
			});

			/** The catalog ranks a guest's artists, so it is waited for too. */
			const artistsPending = computed(
				() =>
					store.artistsLoading() ||
					store.releasesLoading() ||
					(catalogOnly() && store.albumsLoading())
			);

			return {
				catalogOnly,
				artistsPending,
				/** Only a guest is asked to sign in. */
				isGuest: computed(() => !store.authenticated()),
				/** Waiting on whichever list the "recently added" row shows. */
				recentPending: computed(
					() =>
						store.releasesLoading() ||
						(catalogOnly() && store.albumsLoading())
				),
				/** Catalog-wide totals named in the sign-in prompt. */
				albumTotal: computed(
					() => store.counts()['Album'] ?? store.albums().length
				),
				artistTotal: computed(
					() => store.counts()['Artist'] ?? store.artists().length
				),
				/** The few worth showing: nearest to complete, empty ones never. */
				collections: computed(() =>
					collections()
						.filter((collection) => collection.total > 0)
						.slice(0, HOME_COLLECTION_COUNT)
				),
				nextAlbums,
				/** Empty where there is no shelf to continue, or no gap left. */
				showsHunt: computed(() => nextAlbums().length > 0),
				completedCollections: computed(
					() =>
						collections().filter(
							(collection) => collection.completed
						).length
				),
				spotlightCandidates,
				spotlight,
				spotlightReleaseCount: computed(() => {
					const artist = spotlight();
					return artist ? (counts().get(artist.id) ?? 0) : 0;
				}),
				spotlightAlbumCount: computed(() => {
					const artist = spotlight();
					return artist ? (albumCounts().get(artist.id) ?? 0) : 0;
				}),
				spotlightReleases: computed(() => {
					const artist = spotlight();

					return artist
						? store
								.releases()
								.filter(
									(release) => release.artistId === artist.id
								)
								.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
								.slice(0, SPOTLIGHT_RELEASE_COUNT)
						: [];
				}),
				catalog: computed(() => catalogStats(store.counts())),
				/** Catalog rows: by style, by decade, by kind of act. */
				styleGroups: computed(() =>
					measure(
						'home.styleGroups',
						{ albums: store.albums().length },
						() =>
							albumsByStyle(
								store.albums(),
								GROUP_COUNT,
								GROUP_ALBUM_COUNT
							)
					)
				),
				decadeGroups: computed(() =>
					measure(
						'home.decadeGroups',
						{ albums: store.albums().length },
						() =>
							albumsByDecade(
								store.albums(),
								GROUP_COUNT,
								GROUP_ALBUM_COUNT
							)
					)
				),
				artistGroups: computed(() =>
					artistsByType(
						store.artists(),
						albumCounts(),
						GROUP_ARTIST_COUNT
					)
				),
				/** The catalog entries written last — what stands in for the
				 * recently added copies when there is no collection. */
				newInCatalog: computed(() =>
					newInCatalog(store.albums(), RECENT_COUNT)
				),
				coverage: computed(() =>
					measure(
						'home.coverage',
						{
							albums: store.albums().length,
							releases: store.releases().length,
						},
						() => decadeCoverage(store.albums(), store.releases())
					)
				),
				recentReleases: computed(() =>
					[...store.releases()]
						.sort((a, b) => b.addedAt - a.addedAt)
						.slice(0, RECENT_COUNT)
				),
				topArtists: computed(() =>
					catalogOnly()
						? mostCatalogedArtists(
								store.artists(),
								albumCounts(),
								ARTIST_COUNT
							)
						: mostCollectedArtists(
								store.artists(),
								counts(),
								ARTIST_COUNT
							)
				),
				searchResults: computed(() =>
					searchHome(
						store.query(),
						store.artists(),
						store.releases(),
						store.albums(),
						SEARCH_RESULT_COUNT,
						text.catalog()
					)
				),
				newestAlbums: computed(() =>
					measure(
						'home.newestAlbums',
						{ albums: store.albums().length },
						() =>
							store
								.albums()
								.filter((album) => album.coverUrl)
								.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
								.slice(0, ALBUM_COUNT)
					)
				),
			};
		}
	),
	withMethods(
		(
			store,
			artistStateService = inject(ArtistStateService),
			albumStateService = inject(AlbumStateService),
			authenticationStateService = inject(AuthenticationStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			quantityStateService = inject(EntityQuantityStateService),
			musicCollectionEffect = inject(MusicCollectionEffect)
		) => {
			/**
			 * Picks the spotlight once everything it is ranked by has
			 * arrived, so the artists of the catalog are not passed over
			 * while the collection is still on its way.
			 */
			const ensureSpotlight = () => {
				if (!store.spotlightId() && !store.artistsPending()) {
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
									artists: measure(
										'home.mapArtists',
										{ artists: artists.length },
										() => artists.map(toArtistView)
									),
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
							next: (albums) => {
								patchState(store, {
									albums: measure(
										'home.mapAlbums',
										{ albums: albums.length },
										() => albums.map(toAlbumView)
									),
									albumsLoading: false,
								});
								ensureSpotlight();
							},
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
									releases: measure(
										'home.mapReleases',
										{ releases: items.length },
										() => items.map(toReleaseView)
									),
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
				/** Follows sign-in and sign-out while the page is open. */
				loadAuthentication: rxMethod<void>(
					pipe(
						switchMap(() =>
							authenticationStateService.selectIsAuthenticated$()
						),
						tapResponse({
							next: (authenticated) =>
								patchState(store, { authenticated }),
							error: (error) => console.error(error),
						})
					)
				),
				/** Google sign-in, the same the top bar offers. */
				signIn: () => authenticationStateService.dispatchLogin(),
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
	withMethods((store) => {
		const analytics = inject(AnalyticsService);
		const query$ = toObservable(store.query);

		return {
			/**
			 * Counts a search once the box has stood still. The term itself
			 * never leaves the browser — only how much it turned up, which is
			 * what says whether the search finds what people come for.
			 */
			watchSearches: rxMethod<void>(
				pipe(
					switchMap(() => query$),
					map((query) => query.trim()),
					debounceTime(SEARCH_SETTLED_MS),
					distinctUntilChanged(),
					filter((query) => query.length >= SEARCH_MIN_LENGTH),
					tap(() =>
						analytics.track('search', {
							results: store
								.searchResults()
								.reduce(
									(found, group) =>
										found + group.items.length,
									0
								),
						})
					)
				)
			),
		};
	}),
	withHooks({
		onInit(store) {
			store.loadArtists(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadReleases(of(undefined));
			store.loadCounts(of(undefined));
			store.loadCollections(of(undefined));
			store.loadAuthentication(of(undefined));
			store.watchSearches(of(undefined));
		},
	})
);
