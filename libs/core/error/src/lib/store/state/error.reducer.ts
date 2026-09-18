import { AppError, ERROR_FEATURE_KEY } from '@music-collection/api';
import { createReducer, on } from '@ngrx/store';

import * as errorActions from './error.actions';

/** Ennyi hibát mutatunk egyszerre; a régebbiek kiesnek. */
const KEPT_ERRORS = 4;

export interface ErrorState {
	errors: AppError[];
}

export interface ErrorPartialState {
	readonly [ERROR_FEATURE_KEY]: ErrorState;
}

export const initialState: ErrorState = { errors: [] };

export const errorReducer = createReducer(
	initialState,
	on(errorActions.report, (state, { error }) => ({
		...state,
		errors: [...state.errors, error].slice(-KEPT_ERRORS),
	})),
	on(errorActions.dismiss, (state, { uid }) => ({
		...state,
		errors: state.errors.filter((error) => error.uid !== uid),
	})),
	on(errorActions.dismissAll, (state) => ({ ...state, errors: [] }))
);
