import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addCollectionItem = createAction(
	'[CollectionItem] Add CollectionItem',
	props<{ collectionItem: CollectionItemEntityAdd }>()
);

export const addCollectionItemFail = createAction(
	'[CollectionItem] Add CollectionItem Fail',
	props<{ error: Error }>()
);

export const addCollectionItemSuccess = createAction(
	'[CollectionItem] Add CollectionItem Success',
	props<{ collectionItem: CollectionItemEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[CollectionItem Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearCollectionItems = createAction(
	'[CollectionItem] Clear CollectionItems'
);

export const deleteCollectionItem = createAction(
	'[CollectionItem] Delete CollectionItem',
	props<{ collectionItem: CollectionItemEntity }>()
);

export const deleteCollectionItemFail = createAction(
	'[CollectionItem] Delete CollectionItem Fail',
	props<{ error: Error }>()
);

export const deleteCollectionItemSuccess = createAction(
	'[CollectionItem] Delete CollectionItem Success',
	props<{ collectionItemId: string }>()
);

export const listCollectionItems = createAction(
	'[CollectionItem] List CollectionItems'
);

export const listCollectionItemsFail = createAction(
	'[CollectionItem] List CollectionItems FAIL',
	props<{ error: Error }>()
);

export const listCollectionItemsSuccess = createAction(
	'[CollectionItem] List CollectionItems Success',
	props<{ collectionItems: CollectionItemEntity[] }>()
);

export const listCollectionItemsByCategoryId = createAction(
	'[CollectionItems] List CollectionItems By Category Id',
	props<{ categoryId: string }>()
);

export const listCollectionItemsByCategoryIdSuccess = createAction(
	'[CollectionItems] List CollectionItems By Category Id Success',
	props<{ collectionItems: CollectionItemEntity[] }>()
);

export const loadCollectionItem = createAction(
	'[CollectionItem] Load CollectionItem',
	props<{ uid: string }>()
);

export const loadCollectionItemFail = createAction(
	'[CollectionItem] Load CollectionItem FAIL',
	props<{ error: Error }>()
);

export const loadCollectionItemSuccess = createAction(
	'[CollectionItem] Load CollectionItem Success',
	props<{ collectionItem: CollectionItemEntity | undefined }>()
);

export const search = createAction(
	'[CollectionItem] Search CollectionItems',
	props<{ term: string }>()
);
export const searchFailed = createAction(
	'[CollectionItem] Search CollectionItems Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[CollectionItem] Search CollectionItems Success',
	props<{ result: CollectionItemEntity[] }>()
);

export const selectCollectionItem = createAction(
	'[CollectionItem] Select CollectionItem',
	props<{ collectionItem: CollectionItemEntity }>()
);

export const selectCollectionItemSuccess = createAction(
	'[Album] Select Collection Item Success',
	props<{ collectionItem: CollectionItemEntity }>()
);

export const setSelectedCollectionItemId = createAction(
	'[CollectionItem Admin] Set Selected CollectionItem Id',
	props<{ collectionItemId: string }>()
);

export const updateCollectionItem = createAction(
	'[CollectionItem] Update CollectionItem',
	props<{ collectionItem: CollectionItemEntityUpdate }>()
);

export const updateCollectionItemFail = createAction(
	'[CollectionItem] Update CollectionItem Fail',
	props<{ error: Error }>()
);

export const updateCollectionItemSuccess = createAction(
	'[CollectionItem] Update CollectionItem Success',
	props<{ collectionItem: Update<CollectionItemEntityUpdate> }>()
);
