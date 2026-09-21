import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
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

import { sortCollectionCards, toCollectionCard } from './collections.mapper';
import { CollectionCardView } from './collections.model';

interface CollectionsPageState {
	collections: CollectionCardView[];
	isLoading: boolean;
}

const initialState: CollectionsPageState = {
	collections: [],
	isLoading: true,
};

export const CollectionsPageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		completedCount: computed(
			() =>
				store.collections().filter((collection) => collection.completed)
					.length
		),
		/** Albums the collections ask for that are not on the shelf yet. */
		missingCount: computed(() =>
			store
				.collections()
				.reduce((sum, collection) => sum + collection.missing, 0)
		),
		/** Only complete collections pay, so this is what is actually held. */
		earnedPoints: computed(() =>
			store
				.collections()
				.reduce((sum, collection) => sum + collection.earnedPoints, 0)
		),
	})),
	withMethods((store, effect = inject(MusicCollectionEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.listStandings$()),
				tapResponse({
					next: (standings: MusicCollectionStanding[]) =>
						patchState(store, {
							collections: sortCollectionCards(
								standings.map(toCollectionCard)
							),
							isLoading: false,
						}),
					error: (error) => {
						console.error(error);
						patchState(store, { isLoading: false });
					},
				})
			)
		),
	})),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
		},
	})
);
