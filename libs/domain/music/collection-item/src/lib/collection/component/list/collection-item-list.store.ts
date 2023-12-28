import {
	combineLatest,
	debounceTime,
	filter,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { inject } from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemListStateModel,
	CollectionItemStateService,
	CollectionItemUtilService,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { CollectionItemListService } from './collection-item-list.service';

const initialCollectionItemListStateModel: CollectionItemListStateModel = {
	allItemsSize: 0,
	collectionItemMaps: [],
	fxLayoutValue: '',
	isLoading: true,
};

export const CollectionItemListState = signalStore(
	withState(initialCollectionItemListStateModel),
	withMethods(
		(
			store,
			collectionItemStateService = inject(CollectionItemStateService),
			collectionItemUtilService = inject(CollectionItemUtilService),
			collectionItemListService = inject(CollectionItemListService),
		) => ({
			init: rxMethod(
				pipe(
					debounceTime(500),
					switchMap(() =>
						combineLatest([
							collectionItemStateService.selectEntities$().pipe(
								tap((entities) => {
									if (!entities?.length) {
										collectionItemStateService.dispatchListEntitiesAction();
									}
								}),
								filter((entities) => entities.length > 0),
							),
							collectionItemStateService.selectCollectionItemListConfig$(),
						]),
					),
					tapResponse({
						next: ([entities, config]) => {
							entities = collectionItemUtilService.filterByArtist(
								entities,
								config?.filterByArtistNames?.map(
									(item) => item.value,
								) || null,
							);

							patchState(store, {
								allItemsSize: entities.length,
								collectionItemMaps:
									collectionItemListService.createCollectionItemMap(
										collectionItemUtilService.sortCollectionItems(
											config?.sortBy || null,
											entities,
										),
										config,
									),
								fxLayoutValue:
									collectionItemListService.createFxLayoutValue(
										config,
									),
							});

							patchState(store, { isLoading: false });
						},
						error: console.error,
						finalize: () => {
							patchState(store, { isLoading: false });
						},
					}),
				),
			),
			collectionItemClick: (collectionItem: CollectionItemEntity) =>
				collectionItemListService.collectionItemClick(collectionItem),
		}),
	),
	withHooks({
		onInit({ init }) {
			init(of(''));
		},
	}),
);
