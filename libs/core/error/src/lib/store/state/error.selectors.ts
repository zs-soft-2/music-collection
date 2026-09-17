import { ERROR_FEATURE_KEY } from '@music-collection/api';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ErrorState } from './error.reducer';

export const selectErrorState =
	createFeatureSelector<ErrorState>(ERROR_FEATURE_KEY);

export const selectErrors = createSelector(
	selectErrorState,
	(state) => state.errors
);
