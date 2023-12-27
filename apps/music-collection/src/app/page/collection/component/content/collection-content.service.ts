import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
	BaseService,
	CollectionItemEntity,
	CollectionItemListConfig,
	CollectionItemStateService,
} from '@music-collection/api';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { CollectionContentModel } from '../../api';

const initCollectionContentModel: CollectionContentModel = {
	collectionItemListConfig: {
		filterByArtistNames: null,
		groupBy: null,
		sortBy: null,
	},
	isLoading: true,
};

export const CollectionContentStore = signalStore(
	withState(initCollectionContentModel),
	withMethods(
		(
			store,
			collectionItemStateService = inject(
				CollectionItemStateService,
			),
			router = inject(Router),
		) => ({
			selectCollectionItem: (
				collectionItem: CollectionItemEntity,
			) => {
				router.navigate([
					'album',
					collectionItem.release.album.uid,
				]);
			},
			configChange: (
				collectionItemListConfig: CollectionItemListConfig,
			) => {
				patchState(store, { collectionItemListConfig });

				collectionItemStateService.dispatchSetCollectionItemConfigAction(
					collectionItemListConfig,
				);
			},
		}),
	),
);

@Injectable()
export class CollectionContentService extends BaseService {
	private store!: any;

	public init$(): any {
		return this.store;
	}
}
