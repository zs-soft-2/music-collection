import { of, pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import {
	CollectionGroupByEnum,
	collectionGroupByList,
	CollectionItemStateService,
	CollectionSidebarStateModel,
	CollectionSortByEnum,
	collectionSortByList,
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

import { CollectionSidebarService } from './collection-sidebar.service';
import { RadioButtonClickEvent } from 'primeng/radiobutton';
import { MultiSelectChangeEvent } from 'primeng/multiselect';

const initialCollectionSidebarStateModel: CollectionSidebarStateModel = {
	filterByArtistNames: null,
	sortBy: null,
	groupBy: null,
	isSidebarVisible: false,
	filterByArtistNameList: [],
	groupByList: [],
	sortByList: [],
	isLoading: true,
};

export const CollectionSidebarStore = signalStore(
	withState(initialCollectionSidebarStateModel),
	withMethods(
		(
			store,
			collectionItemStateService = inject(CollectionItemStateService),
			collectionSidebarService = inject(CollectionSidebarService),
		) => ({
            save: () => {
                collectionSidebarService.save({
                    filterByArtistNames: store.filterByArtistNames(),
                    groupBy: store.groupBy(),
                    sortBy: store.sortBy(),
                });
            },
            changeSortBy: (event: RadioButtonClickEvent): void => {
                patchState(store, {
                    sortBy: event.value
                })
            },
            changeGroupBy: (event: MultiSelectChangeEvent): void => {
                patchState(store, {
                    groupBy: event.value
                })
            },
            changeFilterBy: (event: MultiSelectChangeEvent): void => {
                patchState(store, {
                    filterByArtistNames: event.value
                })
            },
			init: rxMethod(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() =>
						collectionItemStateService.selectEntities$(),
					),
					tapResponse({
						next: (entities: any[]) => {
							const artistNameSet: Set<string> = new Set();

							entities.forEach((entity) => {
								artistNameSet.add(entity.release.artist.name);
							});

							patchState(store, {
								filterByArtistNames: null,
									sortBy: CollectionSortByEnum.ascArtistName,
									groupBy: [
										{
											value: CollectionGroupByEnum.artist,
											label: CollectionGroupByEnum.artist.toString(),
										},
									],
								filterByArtistNameList: Array.from(
									artistNameSet.keys(),
								).map((name) => ({ value: name, label: name })),
								isSidebarVisible: false,
								groupByList: collectionGroupByList,
								sortByList: collectionSortByList,
							});
						},
						error: console.error,
						finalize: () => patchState(store, { isLoading: false }),
					}),
				),
			),
			visibleSidebar: (value: boolean): void => {
				patchState(store, {
                    isSidebarVisible: value
                })
			},
		}),
	),
	withHooks({
		onInit({ init }) {
			init(of(''));
		},
	}),
);
