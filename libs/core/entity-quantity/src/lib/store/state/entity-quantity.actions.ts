import {
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addEntityQuantity = createAction(
	'[EntityQuantity] Add EntityQuantity',
	props<{ entityQuantity: EntityQuantityEntityAdd }>()
);

export const addEntityQuantityFail = createAction(
	'[EntityQuantity] Add EntityQuantity Fail',
	props<{ error: Error }>()
);

export const addEntityQuantitySuccess = createAction(
	'[EntityQuantity] Add EntityQuantity Success',
	props<{ entityQuantity: EntityQuantityEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[EntityQuantity Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearEntityQuantities = createAction(
	'[EntityQuantity] Clear EntityQuantities'
);

export const deleteEntityQuantity = createAction(
	'[EntityQuantity] Delete EntityQuantity',
	props<{ entityQuantity: EntityQuantityEntity }>()
);

export const deleteEntityQuantityFail = createAction(
	'[EntityQuantity] Delete EntityQuantity Fail',
	props<{ error: Error }>()
);

export const deleteEntityQuantitySuccess = createAction(
	'[EntityQuantity] Delete EntityQuantity Success',
	props<{ entityQuantityId: string }>()
);

export const listEntityQuantities = createAction(
	'[EntityQuantity] List EntityQuantities'
);

export const listEntityQuantitiesFail = createAction(
	'[EntityQuantity] List EntityQuantities FAIL',
	props<{ error: Error }>()
);

export const listEntityQuantitiesSuccess = createAction(
	'[EntityQuantity] List EntityQuantities Success',
	props<{ entityQuantities: EntityQuantityEntity[] }>()
);

export const listEntityQuantitiesByCategoryId = createAction(
	'[EntityQuantities] List EntityQuantities By Category Id',
	props<{ categoryId: string }>()
);

export const listEntityQuantitiesByCategoryIdSuccess = createAction(
	'[EntityQuantities] List EntityQuantities By Category Id Success',
	props<{ entityQuantities: EntityQuantityEntity[] }>()
);

export const loadEntityQuantity = createAction(
	'[EntityQuantity] Load EntityQuantity',
	props<{ uid: string }>()
);

export const loadEntityQuantityFail = createAction(
	'[EntityQuantity] Load EntityQuantity FAIL',
	props<{ error: Error }>()
);

export const loadEntityQuantitySuccess = createAction(
	'[EntityQuantity] Load EntityQuantity Success',
	props<{ entityQuantity: EntityQuantityEntity | undefined }>()
);

export const search = createAction(
	'[EntityQuantity] Search EntityQuantities',
	props<{ term: string }>()
);
export const searchFailed = createAction(
	'[EntityQuantity] Search EntityQuantities Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[EntityQuantity] Search EntityQuantities Success',
	props<{ result: EntityQuantityEntity[] }>()
);

export const selectEntityQuantity = createAction(
	'[EntityQuantity] Select EntityQuantity',
	props<{ entityQuantityId: string }>()
);

export const setSelectedEntityQuantityId = createAction(
	'[EntityQuantity Admin] Set Selected EntityQuantity Id',
	props<{ entityQuantityId: string }>()
);

export const updateEntityQuantity = createAction(
	'[EntityQuantity] Update EntityQuantity',
	props<{ entityQuantity: EntityQuantityEntityUpdate }>()
);

export const updateEntityQuantityFail = createAction(
	'[EntityQuantity] Update EntityQuantity Fail',
	props<{ error: Error }>()
);

export const updateEntityQuantitySuccess = createAction(
	'[EntityQuantity] Update EntityQuantity Success',
	props<{ entityQuantity: Update<EntityQuantityEntityUpdate> }>()
);
