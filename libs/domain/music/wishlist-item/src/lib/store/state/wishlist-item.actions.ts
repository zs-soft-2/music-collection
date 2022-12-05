import {
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate,
	SearchParams,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addWishlistItem = createAction(
	'[WishlistItem] Add WishlistItem',
	props<{ wishlistItem: WishlistItemEntityAdd }>()
);

export const addWishlistItemFail = createAction(
	'[WishlistItem] Add WishlistItem Fail',
	props<{ error: Error }>()
);

export const addWishlistItemSuccess = createAction(
	'[WishlistItem] Add WishlistItem Success',
	props<{ wishlistItem: WishlistItemEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[WishlistItem Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearWishlistItems = createAction('[WishlistItem] Clear WishlistItems');

export const deleteWishlistItem = createAction(
	'[WishlistItem] Delete WishlistItem',
	props<{ wishlistItem: WishlistItemEntity }>()
);

export const deleteWishlistItemFail = createAction(
	'[WishlistItem] Delete WishlistItem Fail',
	props<{ error: Error }>()
);

export const deleteWishlistItemSuccess = createAction(
	'[WishlistItem] Delete WishlistItem Success',
	props<{ wishlistItemId: string }>()
);

export const listWishlistItems = createAction('[WishlistItem] List WishlistItems');

export const listWishlistItemsFail = createAction(
	'[WishlistItem] List WishlistItems FAIL',
	props<{ error: Error }>()
);

export const listWishlistItemsSuccess = createAction(
	'[WishlistItem] List WishlistItems Success',
	props<{ wishlistItems: WishlistItemEntity[] }>()
);

export const listWishlistItemsByCategoryId = createAction(
	'[WishlistItems] List WishlistItems By Category Id',
	props<{ categoryId: string }>()
);

export const listWishlistItemsByCategoryIdSuccess = createAction(
	'[WishlistItems] List WishlistItems By Category Id Success',
	props<{ wishlistItems: WishlistItemEntity[] }>()
);

export const loadWishlistItem = createAction(
	'[WishlistItem] Load WishlistItem',
	props<{ uid: string }>()
);

export const loadWishlistItemFail = createAction(
	'[WishlistItem] Load WishlistItem FAIL',
	props<{ error: Error }>()
);

export const loadWishlistItemSuccess = createAction(
	'[WishlistItem] Load WishlistItem Success',
	props<{ wishlistItem: WishlistItemEntity | undefined }>()
);

export const search = createAction(
	'[WishlistItem] Search WishlistItems',
	props<{ params: SearchParams }>()
);
export const searchFailed = createAction(
	'[WishlistItem] Search WishlistItems Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[WishlistItem] Search WishlistItems Success',
	props<{ result: WishlistItemEntity[] }>()
);

export const selectWishlistItem = createAction(
	'[WishlistItem] Select WishlistItem',
	props<{ wishlistItem: WishlistItemEntity }>()
);

export const selectWishlistItemSuccess = createAction(
	'[WishlistItem] Select WishlistItem Success',
	props<{ wishlistItem: WishlistItemEntity }>()
);

export const setSelectedWishlistItemId = createAction(
	'[WishlistItem Admin] Set Selected WishlistItem Id',
	props<{ wishlistItemId: string }>()
);

export const updateWishlistItem = createAction(
	'[WishlistItem] Update WishlistItem',
	props<{ wishlistItem: WishlistItemEntityUpdate }>()
);

export const updateWishlistItemFail = createAction(
	'[WishlistItem] Update WishlistItem Fail',
	props<{ error: Error }>()
);

export const updateWishlistItemSuccess = createAction(
	'[WishlistItem] Update WishlistItem Success',
	props<{ wishlistItem: Update<WishlistItemEntityUpdate> }>()
);
