import {
	WISHLIST_ITEM_FEATURE_KEY,
	WishlistItemEntity,
} from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import {
	wishlistItemAdapter,
	WishlistItemPartialState,
	State,
} from './wishlist-item.reducer';

const { selectAll, selectEntities } = wishlistItemAdapter.getSelectors();

export const getWishlistItemState = createFeatureSelector<
	WishlistItemPartialState,
	State
>(WISHLIST_ITEM_FEATURE_KEY);

export const getWishlistItemError = createSelector(
	getWishlistItemState,
	(state: State) => state.error
);

export const getWishlistItemLoading = createSelector(
	getWishlistItemState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getWishlistItemState,
	(state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
	getWishlistItemState,
	(state: State) => state.isNewEntityButtonEnabled
);

export const selectWishlistItemEntities = createSelector(
	getWishlistItemState,
	selectEntities
);

export const selectAllWishlistItem = createSelector(
	getWishlistItemState,
	selectAll
);

export const selectWishlistItem = createSelector(
	selectWishlistItemEntities,
	getSelectedId,
	(wishlistItemEntities, wishlistItemID) =>
		wishlistItemEntities[wishlistItemID]
);

export const selectWishlistItemById = () =>
	createSelector(
		selectWishlistItemEntities,
		(wishlistItemEntities: Dictionary<WishlistItemEntity>, props: any) => {
			const wishlistItemEntity = wishlistItemEntities[props.uid];

			return wishlistItemEntity;
		}
	);

export const selectSearchResult = createSelector(
	getWishlistItemState,
	(state: State) => state.searchResult
);
