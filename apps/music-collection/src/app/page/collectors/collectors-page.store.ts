import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import {
	CollectorCardDocument,
	CollectorProfileEffect,
} from '../../data/collector-profile';

import {
	filterWall,
	sortWall,
	toWallCollections,
	toWallEntries,
} from './collectors.mapper';
import { WallEntry, WallSort } from './collectors.model';

interface CollectorsPageState {
	entries: WallEntry[];
	loading: boolean;
	/** The collection the wall is narrowed to, or null for all of them. */
	slug: string | null;
	query: string;
	sort: WallSort;
}

const initialState: CollectorsPageState = {
	entries: [],
	loading: true,
	slug: null,
	query: '',
	sort: 'recent',
};

/**
 * The wall of finished collections.
 *
 * The directory is read once — through the sync cache, so a second visit
 * costs nothing until somebody's shelf changes — and everything the page
 * offers afterwards happens in the browser. Sorting and filtering by query
 * would be a read per press of a key and an index per order; the entries are
 * a few hundred bytes each, so the whole list is cheaper than the first
 * query would be.
 */
export const CollectorsPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const shown = computed(() =>
			sortWall(
				filterWall(store.entries(), store.slug(), store.query()),
				store.sort()
			)
		);

		return {
			shown,
			/** The collections anybody here has finished — the filter row. */
			collections: computed(() => toWallCollections(store.entries())),
			collectorCount: computed(() => store.entries().length),
			/** How many finished collections the wall holds altogether. */
			badgeCount: computed(() =>
				store
					.entries()
					.reduce((total, entry) => total + entry.badges.length, 0)
			),
			empty: computed(() => !store.loading() && shown().length === 0),
		};
	}),
	withMethods((store, profiles = inject(CollectorProfileEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { loading: true })),
				switchMap(() => profiles.cards$()),
				tapResponse({
					next: (cards: CollectorCardDocument[]) =>
						patchState(store, {
							entries: toWallEntries(cards),
							loading: false,
						}),
					error: (error) => {
						console.error('Collector directory not read', error);
						patchState(store, { loading: false });
					},
				})
			)
		),

		/** Narrows to one collection, or opens the wall up again. */
		selectCollection(slug: string | null): void {
			patchState(store, { slug: store.slug() === slug ? null : slug });
		},

		setQuery(query: string): void {
			patchState(store, { query });
		},

		setSort(sort: WallSort): void {
			patchState(store, { sort });
		},
	}))
);
