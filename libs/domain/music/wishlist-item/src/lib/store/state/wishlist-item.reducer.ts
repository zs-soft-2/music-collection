import {
	WishlistItemEntity,
	WISHLIST_ITEM_FEATURE_KEY,
} from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as wishlistItemActions from './wishlist-item.actions';

export interface State extends EntityState<WishlistItemEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	searchResult: WishlistItemEntity[];
	error?: string | null;
}

export interface WishlistItemPartialState {
	readonly [WISHLIST_ITEM_FEATURE_KEY]: State;
}

export function sort(a: WishlistItemEntity, b: WishlistItemEntity): number {
	return a.albumReference.name < b.albumReference.name ? 1 : -1;
}

export const wishlistItemAdapter: EntityAdapter<WishlistItemEntity> =
	createEntityAdapter<WishlistItemEntity>({
		selectId: (model: WishlistItemEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = wishlistItemAdapter.getInitialState({
	isNewEntityButtonEnabled: true,
	loading: false,
	error: null,
	searchResult: [],
	selectedWishlistItemId: null,
});

export const wishlistItemReducer = createReducer(
	initialState,
	on(wishlistItemActions.addWishlistItemSuccess, (state, { wishlistItem }) =>
		wishlistItemAdapter.addOne(wishlistItem as WishlistItemEntity, state)
	),
	on(
		wishlistItemActions.changeNewEntityButtonEnabled,
		(state, { enabled }) => ({
			...state,
			isNewEntityButtonEnabled: enabled,
		})
	),
	on(wishlistItemActions.selectWishlistItem, (state, { wishlistItem }) => ({
		...state,
		loading: false,
		error: null,
		selectedWishlistItemId: wishlistItem.uid,
	})),
	on(
		wishlistItemActions.updateWishlistItemSuccess,
		(state, { wishlistItem }) =>
			wishlistItemAdapter.updateOne(wishlistItem, state)
	),
	on(
		wishlistItemActions.deleteWishlistItemSuccess,
		(state, { wishlistItemId }) =>
			wishlistItemAdapter.removeOne(wishlistItemId, state)
	),
	on(
		wishlistItemActions.listWishlistItemsSuccess,
		(state, { wishlistItems }) =>
			wishlistItemAdapter.upsertMany(
				wishlistItems as WishlistItemEntity[],
				state
			)
	),
	on(wishlistItemActions.loadWishlistItemSuccess, (state, { wishlistItem }) =>
		wishlistItemAdapter.upsertOne(wishlistItem as WishlistItemEntity, state)
	),
	on(wishlistItemActions.clearWishlistItems, (state) =>
		wishlistItemAdapter.removeAll(state)
	),
	on(
		wishlistItemActions.setSelectedWishlistItemId,
		(state, { wishlistItemId }) => ({
			...state,
			selectedId: wishlistItemId,
		})
	),
	on(wishlistItemActions.searchSuccess, (state, { result }) => {
		return wishlistItemAdapter.upsertMany(result, {
			...state,
			searchResult: result,
		});
	}),
	on(wishlistItemActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return wishlistItemReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	wishlistItemAdapter.getSelectors();
