import {
	CollectionItemDetails,
	CollectionItemDisposal,
	CollectionItemEntity,
	CollectionItemPhoto,
	CollectionItemPlacement,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemListConfig,
	SearchParams,
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

/** Disposes of the copy, or restores it with `disposal: null`. */
export const changeCollectionItemDisposal = createAction(
	'[CollectionItem] Change CollectionItem Disposal',
	props<{
		collectionItem: CollectionItemEntity;
		disposal: CollectionItemDisposal | null;
	}>()
);

export const changeCollectionItemDisposalFail = createAction(
	'[CollectionItem] Change CollectionItem Disposal Fail',
	props<{ error: Error }>()
);

export const changeCollectionItemDisposalSuccess = createAction(
	'[CollectionItem] Change CollectionItem Disposal Success',
	props<{ collectionItem: Update<CollectionItemEntity> }>()
);

/** Files the copy into a compartment, or takes the place back with `null`. */
export const changeCollectionItemPlacement = createAction(
	'[CollectionItem] Change CollectionItem Placement',
	props<{
		collectionItem: CollectionItemEntity;
		placement: CollectionItemPlacement | null;
	}>()
);

export const changeCollectionItemPlacementFail = createAction(
	'[CollectionItem] Change CollectionItem Placement Fail',
	props<{ error: Error }>()
);

export const changeCollectionItemPlacementSuccess = createAction(
	'[CollectionItem] Change CollectionItem Placement Success',
	props<{ collectionItem: Update<CollectionItemEntity> }>()
);

/**
 * Writes what the collector tells about the copy — how it was come by, how
 * it has held up, the story behind it. The whole telling is written at once,
 * so a field emptied on the page is emptied on the record.
 */
export const changeCollectionItemDetails = createAction(
	'[CollectionItem] Change CollectionItem Details',
	props<{
		collectionItem: CollectionItemEntity;
		details: CollectionItemDetails;
	}>()
);

export const changeCollectionItemDetailsFail = createAction(
	'[CollectionItem] Change CollectionItem Details Fail',
	props<{ error: Error }>()
);

export const changeCollectionItemDetailsSuccess = createAction(
	'[CollectionItem] Change CollectionItem Details Success',
	props<{ collectionItem: Update<CollectionItemEntity> }>()
);

/**
 * Writes the photos of the copy. The pictures are already in Storage by the
 * time this runs: what is written is the list pointing at them, front first.
 */
export const changeCollectionItemPhotos = createAction(
	'[CollectionItem] Change CollectionItem Photos',
	props<{
		collectionItem: CollectionItemEntity;
		photos: CollectionItemPhoto[];
	}>()
);

export const changeCollectionItemPhotosFail = createAction(
	'[CollectionItem] Change CollectionItem Photos Fail',
	props<{ error: Error }>()
);

export const changeCollectionItemPhotosSuccess = createAction(
	'[CollectionItem] Change CollectionItem Photos Success',
	props<{ collectionItem: Update<CollectionItemEntity> }>()
);

/**
 * Files several copies at once — a compartment rearranged by hand moves
 * every record in it, and they move together or not at all.
 */
export const changeCollectionItemPlacements = createAction(
	'[CollectionItem] Change CollectionItem Placements',
	props<{
		placements: {
			collectionItem: CollectionItemEntity;
			placement: CollectionItemPlacement | null;
		}[];
	}>()
);

export const changeCollectionItemPlacementsFail = createAction(
	'[CollectionItem] Change CollectionItem Placements Fail',
	props<{ error: Error }>()
);

export const changeCollectionItemPlacementsSuccess = createAction(
	'[CollectionItem] Change CollectionItem Placements Success',
	props<{ collectionItems: Update<CollectionItemEntity>[] }>()
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
	props<{ params: SearchParams }>()
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

export const setCollectionItemListConfig = createAction(
	'[CollectionItem] Set CollectionItem List Config',
	props<{ collectionItemListConfig: CollectionItemListConfig }>()
);
