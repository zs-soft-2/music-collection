import { pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import {
	patchState,
	signalStoreFeature,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { UserSettingsEffect } from '../../../data/user-settings';
import { ALBUM_VIEW_SETTING } from '../album-view.setting';

interface AlbumViewState {
	/** Sections collapsed, so the whole album fits on one screen. */
	compact: boolean;
}

const initialState: AlbumViewState = { compact: false };

/** The album page layout the collector keeps, with their other settings. */
export function withAlbumView() {
	return signalStoreFeature(
		withState(initialState),
		withMethods((store, settingsEffect = inject(UserSettingsEffect)) => ({
			/** The layout kept for the user, and any later change to it. */
			loadView: rxMethod<void>(
				pipe(
					switchMap(() => settingsEffect.value$(ALBUM_VIEW_SETTING)),
					tap(({ compact }) => {
						if (compact !== null) {
							patchState(store, { compact });
						}
					})
				)
			),
			/** Collapses the sections, or opens them again, for good. */
			toggleCompact(): void {
				const compact = !store.compact();

				patchState(store, { compact });
				settingsEffect
					.save(ALBUM_VIEW_SETTING, { compact })
					.catch((error) => {
						console.error('Album view not saved', error);
					});
			},
		}))
	);
}
