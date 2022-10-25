import {
  LabelEntity,
  LabelEntityAdd,
  LabelEntityUpdate,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addLabel = createAction(
  '[Label] Add Label',
  props<{ label: LabelEntityAdd }>()
);

export const addLabelFail = createAction(
  '[Label] Add Label Fail',
  props<{ error: Error }>()
);

export const addLabelSuccess = createAction(
  '[Label] Add Label Success',
  props<{ label: LabelEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
  '[Label Admin] Change new Entity Button Enabled',
  props<{ enabled: boolean }>()
);

export const clearLabels = createAction('[Label] Clear Labels');

export const deleteLabel = createAction(
  '[Label] Delete Label',
  props<{ label: LabelEntity }>()
);

export const deleteLabelFail = createAction(
  '[Label] Delete Label Fail',
  props<{ error: Error }>()
);

export const deleteLabelSuccess = createAction(
  '[Label] Delete Label Success',
  props<{ labelId: string }>()
);

export const listLabels = createAction('[Label] List Labels');

export const listLabelsFail = createAction(
  '[Label] List Labels FAIL',
  props<{ error: Error }>()
);

export const listLabelsSuccess = createAction(
  '[Label] List Labels Success',
  props<{ labels: LabelEntity[] }>()
);

export const listLabelsByCategoryId = createAction(
  '[Labels] List Labels By Category Id',
  props<{ categoryId: string }>()
);

export const listLabelsByCategoryIdSuccess = createAction(
  '[Labels] List Labels By Category Id Success',
  props<{ labels: LabelEntity[] }>()
);

export const loadLabel = createAction(
  '[Label] Load Label',
  props<{ uid: string }>()
);

export const loadLabelFail = createAction(
  '[Label] Load Label FAIL',
  props<{ error: Error }>()
);

export const loadLabelSuccess = createAction(
  '[Label] Load Label Success',
  props<{ label: LabelEntity | undefined }>()
);

export const search = createAction(
  '[Label] Search Labels',
  props<{ term: string }>()
);
export const searchFailed = createAction(
  '[Label] Search Labels Failed',
  props<{ error: string }>()
);
export const searchSuccess = createAction(
  '[Label] Search Labels Success',
  props<{ result: LabelEntity[] }>()
);

export const selectLabel = createAction(
  '[Label] Select Label',
  props<{ labelId: string }>()
);

export const setSelectedLabelId = createAction(
  '[Label Admin] Set Selected Label Id',
  props<{ labelId: string }>()
);

export const updateLabel = createAction(
  '[Label] Update Label',
  props<{ label: LabelEntityUpdate }>()
);

export const updateLabelFail = createAction(
  '[Label] Update Label Fail',
  props<{ error: Error }>()
);

export const updateLabelSuccess = createAction(
  '[Label] Update Label Success',
  props<{ label: Update<LabelEntityUpdate> }>()
);
