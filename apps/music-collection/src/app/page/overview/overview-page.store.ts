import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemStateService,
} from '@music-collection/api';
import { LanguageService, TextService } from '@music-collection/core/i18n';
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

import { AlbumRating, RatingEffect } from '../../data/rating';
import {
	MediaFormat,
	ReleaseView,
	decadeDistribution,
	toReleaseView,
	topStyles,
} from '../../shared/music-ui';
import { withCollectionFollowing } from '../collections/collection-following.feature';
import {
	sortCollectionCards,
	toCollectionCard,
} from '../collections/collections.mapper';
import { CollectionCardView } from '../collections/collections.model';
import { collectionStats } from '../collection/collection.mapper';
import {
	addedRecently,
	distinctCount,
	formatCounts,
	latestArrivals,
	monthlyGrowth,
	topArtists,
} from './overview.mapper';
import {
	OverviewStat,
	RECENT_COUNT,
	TOP_ARTIST_COUNT,
} from './overview.model';

/**
 * Styles the ring is given. More than the six it can colour: the ones past
 * the sixth are what its "other" slice is the sum of, and a ring told only
 * about six would have nothing to add up.
 */
const STYLE_DEPTH = 40;

interface OverviewPageState {
	releases: ReleaseView[];
	isLoading: boolean;
	/** A guest has no collection to overview; they are asked to sign in. */
	isAuthenticated: boolean;
	/** The published collections with where this shelf gets the collector. */
	standings: MusicCollectionStanding[];
	standingsLoading: boolean;
	/** The collector's own verdicts, for how much of the shelf was judged. */
	ratings: AlbumRating[];
}

const initialState: OverviewPageState = {
	releases: [],
	isLoading: true,
	isAuthenticated: false,
	standings: [],
	standingsLoading: true,
	ratings: [],
};

export const OverviewPageStore = signalStore(
	withState(initialState),
	withCollectionFollowing(),
	withComputed(
		(
			store,
			text = inject(TextService),
			language = inject(LanguageService)
		) => {
			const stats = computed(() => collectionStats(store.releases()));

			const collections = computed<CollectionCardView[]>(() => {
				const followedUids = store.followedUids();
				const followingOnly = !store.followsNothing();

				return sortCollectionCards(
					store.standings().map(toCollectionCard)
				).filter(
					(collection) =>
						collection.total > 0 &&
						(!followingOnly || followedUids.has(collection.uid))
				);
			});

			/** Albums the collector has said something about. */
			const ratedAlbums = computed(
				() =>
					new Set(store.ratings().map((rating) => rating.albumId))
			);

			return {
				stats,
				collections,
				/**
				 * The four headline numbers, each with what arrived in the
				 * last month beside it. Styles and labels get no arrow: a
				 * collection gains a style the day a record brings a new one
				 * in, which is a fact about that record, not about the month.
				 */
				headline: computed<OverviewStat[]>(() => {
					const releases = store.releases();

					return [
						{
							key: 'copies',
							labelKey: 'page.overview.stat.copies',
							icon: 'pi-database',
							value: stats().total,
							delta: addedRecently(releases),
						},
						{
							key: 'artists',
							labelKey: 'page.overview.stat.artists',
							icon: 'pi-users',
							value: stats().artists,
							delta: null,
						},
						{
							key: 'styles',
							labelKey: 'page.overview.stat.styles',
							icon: 'pi-tags',
							value: distinctCount(
								releases,
								(release) => release.styles
							),
							delta: null,
						},
						{
							key: 'labels',
							labelKey: 'page.overview.stat.labels',
							icon: 'pi-bookmark',
							value: distinctCount(
								releases,
								(release) => release.labelName
							),
							delta: null,
						},
					];
				}),
				styles: computed(() =>
					topStyles(store.releases(), STYLE_DEPTH)
				),
				decades: computed(() => decadeDistribution(store.releases())),
				formats: computed(() => {
					const label = text.catalog();

					return formatCounts(stats().byFormat, (format: MediaFormat) =>
						label('media', format)
					);
				}),
				topArtists: computed(() =>
					topArtists(store.releases(), TOP_ARTIST_COUNT)
				),
				arrivals: computed(() =>
					latestArrivals(store.releases(), RECENT_COUNT)
				),
				/**
				 * The months are named in the language in force, so the line
				 * is redrawn when the collector switches language — the
				 * labels are the only thing that changes, and they are what
				 * the hover reads out.
				 */
				growth: computed(() => {
					const month = new Intl.DateTimeFormat(language.locale(), {
						month: 'short',
					});

					return monthlyGrowth(store.releases(), (at: Date) =>
						month.format(at)
					);
				}),
				collectionsSummary: computed(() => ({
					total: collections().length,
					completed: collections().filter(
						(collection) => collection.completed
					).length,
					/** Records the collections ask for, not on the shelf. */
					missing: collections().reduce(
						(sum, collection) => sum + collection.missing,
						0
					),
				})),
				/** How many copies on the shelf carry a verdict of their own. */
				rated: computed(() => {
					const rated = ratedAlbums();

					return store
						.releases()
						.filter((release) => rated.has(release.albumId)).length;
				}),
				collectionsLoading: computed(
					() => store.standingsLoading() || !store.followingLoaded()
				),
			};
		}
	),
	withMethods(
		(
			store,
			authentication = inject(AuthenticationStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			musicCollectionEffect = inject(MusicCollectionEffect),
			ratingEffect = inject(RatingEffect)
		) => ({
			/**
			 * Who the overview is of. `authenticatedGuard` keeps a guest off
			 * the route; this is what is left for the case it is reached
			 * without a session, so the page says so instead of reporting a
			 * collection of nothing.
			 */
			watchSession: rxMethod<void>(
				pipe(
					switchMap(() => authentication.selectIsAuthenticated$()),
					tap((isAuthenticated) =>
						patchState(store, { isAuthenticated })
					)
				)
			),
			login(): void {
				authentication.dispatchLogin();
			},
			load: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() =>
						collectionItemStateService.selectLoadedEntities$()
					),
					tapResponse({
						next: (entities: CollectionItemEntity[]) =>
							patchState(store, {
								releases: entities.map(toReleaseView),
								isLoading: false,
							}),
						error: (error: unknown) => {
							console.error(error);
							patchState(store, { isLoading: false });
						},
					})
				)
			),
			loadCollections: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { standingsLoading: true })),
					switchMap(() => musicCollectionEffect.listStandings$()),
					tapResponse({
						next: (standings: MusicCollectionStanding[]) =>
							patchState(store, {
								standings,
								standingsLoading: false,
							}),
						error: (error: unknown) => {
							console.error(error);
							patchState(store, { standingsLoading: false });
						},
					})
				)
			),
			loadRatings: rxMethod<void>(
				pipe(
					switchMap(() => ratingEffect.list$()),
					tapResponse({
						next: (ratings: AlbumRating[]) =>
							patchState(store, { ratings }),
						error: (error: unknown) => console.error(error),
					})
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.watchSession(of(undefined));
			store.load(of(undefined));
			store.loadCollections(of(undefined));
			store.loadFollowing(of(undefined));
			store.loadRatings(of(undefined));
		},
	})
);
