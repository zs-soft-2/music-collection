import { LABEL_FEATURE_KEY, LabelEntity } from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { labelAdapter, LabelPartialState, State } from './label.reducer';

const { selectAll, selectEntities } = labelAdapter.getSelectors();

export const getLabelState = createFeatureSelector<LabelPartialState, State>(
  LABEL_FEATURE_KEY
);

export const getLabelError = createSelector(
  getLabelState,
  (state: State) => state.error
);

export const getLabelLoading = createSelector(
  getLabelState,
  (state: State) => state.loading
);

export const getSelectedId = createSelector(
  getLabelState,
  (state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
  getLabelState,
  (state: State) => state.isNewEntityButtonEnabled
);

export const selectLabelEntities = createSelector(
  getLabelState,
  selectEntities
);

export const selectAllLabel = createSelector(getLabelState, selectAll);

export const selectLabel = createSelector(
  selectLabelEntities,
  getSelectedId,
  (labelEntities, labelID) => labelEntities[labelID]
);

export const selectLabelById = () =>
  createSelector(
    selectLabelEntities,
    (labelEntities: Dictionary<LabelEntity>, props: any) => {
      const labelEntity = labelEntities[props.uid];

      return labelEntity;
    }
  );

export const selectSearchResult = createSelector(
  getLabelState,
  (state: State) => state.searchResult
);
