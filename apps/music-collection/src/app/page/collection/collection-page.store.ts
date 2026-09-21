import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemStateService,
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

import { UserSettingsEffect } from '../../data/user-settings';
import {
	ReleaseView,
	decadeDistribution,
	toReleaseView,
	topStyles,
} from '../../shared/music-ui';
import {
	sortCollectionCards,
	toCollectionCard,
} from '../collections/collections.mapper';
import { CollectionCardView } from '../collections/collections.model';

import {
	chunkGroups,
	collectionStats,
	filterReleases,
	groupReleases,
	packShelf,
	sortReleases,
} from './collection.mapper';
import {
	COLLECTION_VIEW_DEFAULTS,
	COLLECTION_VIEW_SETTING,
	CollectionViewSettings,
} from './collection-view.setting';
import {
	CollectionGroup,
	CollectionSort,
	CollectionView,
	FormatFilter,
	ReleaseGroup,
} from './collection.model';

/** Spines per shelf compartment before it continues in the next one. */
const SHELF_CUBBY_SIZE = 36;

/**
 * Cards / rows per render chunk of the grid and list views. The first chunk
 * renders at once, the rest when they approach the viewport (`@defer`).
 */
const RENDER_CHUNK_SIZE = 30;

/** Styles listed in the "Top styles" panel. */
const STYLE_COUNT = 6;

interface CollectionPageState {
	releases: ReleaseView[];
	isLoading: boolean;
	/** The published collections with where this shelf gets the collector. */
	standings: MusicCollectionStanding[];
	standingsLoading: boolean;
	query: string;
	format: FormatFilter;
	sort: CollectionSort;
	group: CollectionGroup;
	view: CollectionView;
}

const initialState: CollectionPageState = {
	releases: [],
	isLoading: true,
	standings: [],
	standingsLoading: true,
	query: '',
	format: 'all',
	...COLLECTION_VIEW_DEFAULTS,
};

/** Only what the user has actually chosen; the rest stays as it is. */
function chosen(
	settings: CollectionViewSettings
): Partial<CollectionPageState> {
	return Object.fromEntries(
		Object.entries(settings).filter(([, value]) => value !== null)
	);
}

export const CollectionPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const stats = computed(() => collectionStats(store.releases()));
		const visible = computed(() =>
			sortReleases(
				filterReleases(store.releases(), store.query(), store.format()),
				store.sort()
			)
		);

		const groups = computed(() => groupReleases(visible(), store.group()));

		/*
		 * The collections this shelf is measured against. An empty one — a
		 * rule the catalog has nothing for — says nothing about the shelf,
		 * so it stays out; nearly finished ones come first.
		 */
		const collections = computed<CollectionCardView[]>(() =>
			sortCollectionCards(store.standings().map(toCollectionCard)).filter(
				(collection) => collection.total > 0
			)
		);

		return {
			stats,
			collections,
			collectionsSummary: computed(() => ({
				total: collections().length,
				completed: collections().filter(
					(collection) => collection.completed
				).length,
				/** Records the collections ask for that are not on the shelf. */
				missing: collections().reduce(
					(sum, collection) => sum + collection.missing,
					0
				),
				/** Only a complete collection pays, so this is what is held. */
				earnedPoints: collections().reduce(
					(sum, collection) => sum + collection.earnedPoints,
					0
				),
			})),
			decades: computed(() => decadeDistribution(store.releases())),
			styles: computed(() => topStyles(store.releases(), STYLE_COUNT)),
			visible,
			/*
			 * Keyed by view as well: @for only reconciles when the array
			 * changes, so a grid ↔ list switch must yield new groups to
			 * rebuild them with fresh (not yet triggered) deferred chunks.
			 */
			groups: computed(() => {
				const view = store.view();

				return chunkGroups(groups(), RENDER_CHUNK_SIZE).map(
					(group) => ({ ...group, key: `${view}:${group.key}` })
				);
			}),
			/**
			 * Shelf compartments: without grouping the shelf is organised by
			 * format. Groups are packed into cubbies the way a collector
			 * shelves records: small groups share a cubby, large ones continue
			 * in the next.
			 */
			shelfCompartments: computed<ReleaseGroup[]>(() =>
				packShelf(
					store.group() === 'none'
						? groupReleases(visible(), 'format')
						: groups(),
					SHELF_CUBBY_SIZE
				)
			),
			hasFilter: computed(
				() => store.query().trim() !== '' || store.format() !== 'all'
			),
		};
	}),
	withMethods(
		(
			store,
			collectionItemStateService = inject(CollectionItemStateService),
			musicCollectionEffect = inject(MusicCollectionEffect),
			settingsEffect = inject(UserSettingsEffect)
		) => {
			const savePreferences = () => {
				settingsEffect
					.save(COLLECTION_VIEW_SETTING, {
						sort: store.sort(),
						group: store.group(),
						view: store.view(),
					})
					.catch((error) => {
						console.error('Collection view not saved', error);
					});
			};

			return {
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
							error: (error) => {
								console.error(error);
								patchState(store, { isLoading: false });
							},
						})
					)
				),
				loadCollections: rxMethod<void>(
					pipe(
						tap(() =>
							patchState(store, { standingsLoading: true })
						),
						switchMap(() => musicCollectionEffect.listStandings$()),
						tapResponse({
							next: (standings: MusicCollectionStanding[]) =>
								patchState(store, {
									standings,
									standingsLoading: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { standingsLoading: false });
							},
						})
					)
				),
				/** The layout kept for the user, and any later change to it. */
				loadPreferences: rxMethod<void>(
					pipe(
						switchMap(() =>
							settingsEffect.value$(COLLECTION_VIEW_SETTING)
						),
						tap((settings) => patchState(store, chosen(settings)))
					)
				),
				setQuery: (query: string) => patchState(store, { query }),
				setFormat: (format: FormatFilter) =>
					patchState(store, { format }),
				setSort: (sort: CollectionSort) => {
					patchState(store, { sort });
					savePreferences();
				},
				setGroup: (group: CollectionGroup) => {
					patchState(store, { group });
					savePreferences();
				},
				setView: (view: CollectionView) => {
					patchState(store, { view });
					savePreferences();
				},
				clearFilters: () =>
					patchState(store, { query: '', format: 'all' }),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadPreferences(of(undefined));
			store.load(of(undefined));
			store.loadCollections(of(undefined));
		},
	})
);
