import { filter, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	CollectionItemEntity,
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

import { ReleaseView, toReleaseView } from '../../shared/music-ui';

import {
	chunkGroups,
	collectionStats,
	filterReleases,
	groupReleases,
	packShelf,
	sortReleases,
} from './collection.mapper';
import {
	CollectionGroup,
	CollectionSort,
	CollectionView,
	FormatFilter,
	GROUP_OPTIONS,
	ReleaseGroup,
	SORT_OPTIONS,
	VIEW_OPTIONS,
} from './collection.model';

/** Spines per shelf compartment before it continues in the next one. */
const SHELF_CUBBY_SIZE = 36;

/**
 * Cards / rows per render chunk of the grid and list views. The first chunk
 * renders at once, the rest when they approach the viewport (`@defer`).
 */
const RENDER_CHUNK_SIZE = 30;

interface CollectionPageState {
	releases: ReleaseView[];
	isLoading: boolean;
	query: string;
	format: FormatFilter;
	sort: CollectionSort;
	group: CollectionGroup;
	view: CollectionView;
}

type Preferences = Pick<CollectionPageState, 'sort' | 'group' | 'view'>;

const PREFERENCES_KEY = 'mc.collection.preferences';

const initialState: CollectionPageState = {
	releases: [],
	isLoading: true,
	query: '',
	format: 'all',
	sort: 'artist',
	group: 'none',
	view: 'grid',
};

function readPreferences(): Partial<Preferences> {
	try {
		const raw = localStorage.getItem(PREFERENCES_KEY);
		const stored = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
		const preferences: Partial<Preferences> = {};

		if (SORT_OPTIONS.some((option) => option.value === stored.sort)) {
			preferences.sort = stored.sort;
		}
		if (GROUP_OPTIONS.some((option) => option.value === stored.group)) {
			preferences.group = stored.group;
		}
		if (VIEW_OPTIONS.some((option) => option.value === stored.view)) {
			preferences.view = stored.view;
		}
		return preferences;
	} catch {
		return {};
	}
}

function writePreferences(preferences: Preferences): void {
	try {
		localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
	} catch {
		// Storage unavailable (private mode, blocked site data) — not critical.
	}
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

		return {
			stats,
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
			collectionItemStateService = inject(CollectionItemStateService)
		) => {
			const savePreferences = () =>
				writePreferences({
					sort: store.sort(),
					group: store.group(),
					view: store.view(),
				});

			return {
				load: rxMethod<void>(
					pipe(
						tap(() => patchState(store, { isLoading: true })),
						switchMap(() =>
							collectionItemStateService.selectEntities$().pipe(
								tap((entities) => {
									if (!entities?.length) {
										collectionItemStateService.dispatchListEntitiesAction();
									}
								}),
								filter((entities) => entities?.length > 0)
							)
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
			patchState(store, readPreferences());
			store.load(of(undefined));
		},
	})
);
