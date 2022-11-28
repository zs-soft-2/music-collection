import {
	COLLECTION_ITEM_FEATURE_KEY,
	CollectionItemEntity,
} from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import {
	collectionItemAdapter,
	CollectionItemPartialState,
	State,
} from './collection-item.reducer';

const { selectAll, selectEntities } = collectionItemAdapter.getSelectors();

export const getCollectionItemState = createFeatureSelector<
	CollectionItemPartialState,
	State
>(COLLECTION_ITEM_FEATURE_KEY);

export const getCollectionItemError = createSelector(
	getCollectionItemState,
	(state: State) => state.error
);

export const getCollectionItemLoading = createSelector(
	getCollectionItemState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getCollectionItemState,
	(state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
	getCollectionItemState,
	(state: State) => state.isNewEntityButtonEnabled
);

export const selectCollectionItemEntities = createSelector(
	getCollectionItemState,
	selectEntities
);

export const selectAllCollectionItem = createSelector(
	getCollectionItemState,
	selectAll
);

export const selectCollectionItem = createSelector(
	selectCollectionItemEntities,
	getSelectedId,
	(collectionItemEntities, collectionItemID) =>
		collectionItemEntities[collectionItemID]
);

export const selectCollectionItemById = () =>
	createSelector(
		selectCollectionItemEntities,
		(
			collectionItemEntities: Dictionary<CollectionItemEntity>,
			props: any
		) => {
			const collectionItemEntity = collectionItemEntities[props.uid];

			return collectionItemEntity;
		}
	);

export const selectSearchResult = createSelector(
	getCollectionItemState,
	(state: State) => state.searchResult
);

export const selectCollectionItemListConfig = createSelector(
	getCollectionItemState,
	(state: State) => state.collectionItemListConfig
);
