import { AppError } from '@music-collection/api';
import { createAction, props } from '@ngrx/store';

// A típusok előtagja `[Error]`: az effect ezekre nem jelent újra hibát,
// különben a jelentés önmagát hívná meg.
export const report = createAction(
	'[Error] Report',
	props<{ error: AppError }>()
);

export const dismiss = createAction('[Error] Dismiss', props<{ uid: string }>());

export const dismissAll = createAction('[Error] Dismiss All');
