import {
	CollectionItemEntity,
	COLLECTION_ITEM_FEATURE_KEY,
} from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as collectionItemActions from './collection-item.actions';

export interface State extends EntityState<CollectionItemEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	searchResult: CollectionItemEntity[];
	error?: string | null;
}

export interface CollectionItemPartialState {
	readonly [COLLECTION_ITEM_FEATURE_KEY]: State;
}

export function sort(a: CollectionItemEntity, b: CollectionItemEntity): number {
	return a.release.name < b.release.name ? 1 : -1;
}

export const collectionItemAdapter: EntityAdapter<CollectionItemEntity> =
	createEntityAdapter<CollectionItemEntity>({
		selectId: (model: CollectionItemEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = collectionItemAdapter.getInitialState({
	isNewEntityButtonEnabled: true,
	loading: false,
	error: null,
	searchResult: [],
	selectedCollectionItemId: null,
});

export const collectionItemReducer = createReducer(
	initialState,
	on(
		collectionItemActions.addCollectionItemSuccess,
		(state, { collectionItem }) =>
			collectionItemAdapter.addOne(
				collectionItem as CollectionItemEntity,
				state
			)
	),
	on(
		collectionItemActions.changeNewEntityButtonEnabled,
		(state, { enabled }) => ({
			...state,
			isNewEntityButtonEnabled: enabled,
		})
	),
	on(
		collectionItemActions.selectCollectionItem,
		(state, { collectionItem }) => ({
			...state,
			loading: false,
			error: null,
			selectedCollectionItemId: collectionItem.uid,
		})
	),
	on(
		collectionItemActions.updateCollectionItemSuccess,
		(state, { collectionItem }) =>
			collectionItemAdapter.updateOne(collectionItem, state)
	),
	on(
		collectionItemActions.deleteCollectionItemSuccess,
		(state, { collectionItemId }) =>
			collectionItemAdapter.removeOne(collectionItemId, state)
	),
	on(
		collectionItemActions.listCollectionItemsSuccess,
		(state, { collectionItems }) =>
			collectionItemAdapter.upsertMany(
				collectionItems as CollectionItemEntity[],
				state
			)
	),
	on(
		collectionItemActions.loadCollectionItemSuccess,
		(state, { collectionItem }) =>
			collectionItemAdapter.upsertOne(
				collectionItem as CollectionItemEntity,
				state
			)
	),
	on(collectionItemActions.clearCollectionItems, (state) =>
		collectionItemAdapter.removeAll(state)
	),
	on(
		collectionItemActions.setSelectedCollectionItemId,
		(state, { collectionItemId }) => ({
			...state,
			selectedId: collectionItemId,
		})
	),
	on(collectionItemActions.searchSuccess, (state, { result }) => {
		return collectionItemAdapter.upsertMany(result, {
			...state,
			searchResult: result,
		});
	}),
	on(collectionItemActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return collectionItemReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	collectionItemAdapter.getSelectors();
