import { pipe, switchMap, tap } from 'rxjs';

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
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { toCollectionDetail } from './collections.mapper';
import { AlbumFilter, CollectionDetailView } from './collections.model';

interface CollectionDetailPageState {
	collection: CollectionDetailView | null;
	isLoading: boolean;
	/** The slug names no published collection. */
	notFound: boolean;
	filter: AlbumFilter;
}

const initialState: CollectionDetailPageState = {
	collection: null,
	isLoading: true,
	notFound: false,
	filter: 'all',
};

export const CollectionDetailPageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		albums: computed(() => {
			const albums = store.collection()?.albums ?? [];
			const filter = store.filter();

			return filter === 'all'
				? albums
				: albums.filter(
						(album) => album.owned === (filter === 'owned')
					);
		}),
	})),
	withMethods((store, effect = inject(MusicCollectionEffect)) => ({
		load: rxMethod<string>(
			pipe(
				tap(() =>
					patchState(store, { isLoading: true, notFound: false })
				),
				switchMap((slug) => effect.loadStanding$(slug)),
				tapResponse({
					next: (standing: MusicCollectionStanding | null) =>
						patchState(store, {
							collection: standing
								? toCollectionDetail(standing)
								: null,
							notFound: !standing,
							isLoading: false,
						}),
					error: (error) => {
						console.error(error);
						patchState(store, { isLoading: false });
					},
				})
			)
		),
		setFilter: (filter: AlbumFilter) => patchState(store, { filter }),
	}))
);
