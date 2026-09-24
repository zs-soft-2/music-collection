import { pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import { LanguageEnum } from '@music-collection/core/i18n';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { DefaultLanguageEffect } from '../../../data/default-language';

interface LanguageSettingsState {
	/** Null while nothing is set: the app then follows each browser. */
	language: LanguageEnum | null;
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
	/** Epoch milliseconds of the last successful save; null until one. */
	savedAt: number | null;
}

const initialState: LanguageSettingsState = {
	language: null,
	isLoading: true,
	isSaving: false,
	error: null,
	savedAt: null,
};

/**
 * Admin: the language the app opens in for a reader who has not picked one.
 *
 * It does not change what anybody who *has* picked sees — not even the
 * administrator setting it. That is the point of it: a default is for the
 * people who have said nothing.
 */
export const LanguageSettingsStore = signalStore(
	withState(initialState),
	withMethods((store, effect = inject(DefaultLanguageEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.value$()),
				tapResponse({
					next: (language) =>
						patchState(store, { language, isLoading: false }),
					error: (error: Error) =>
						patchState(store, {
							isLoading: false,
							error: error.message,
						}),
				})
			)
		),

		async save(language: LanguageEnum): Promise<void> {
			patchState(store, { isSaving: true, error: null });

			try {
				await effect.save(language);
				patchState(store, { isSaving: false, savedAt: Date.now() });
			} catch (error) {
				patchState(store, {
					isSaving: false,
					error: (error as Error).message,
				});
			}
		},
	})),
	withHooks({
		onInit: (store) => store.load(),
	})
);
