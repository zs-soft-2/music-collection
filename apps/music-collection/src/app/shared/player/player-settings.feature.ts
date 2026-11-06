import { pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import {
	patchState,
	signalStoreFeature,
	type,
	withMethods,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import {
	type PlayerContext,
	type PlayerSettings,
	PlayerSettingsEffect,
	type PlayerSettingsOverrides,
} from '../../data/player';

/**
 * The collector's player settings, per kind of page: changed from the menu
 * for the page on show, or from the profile for any of them, and kept.
 *
 * The overrides themselves stay in the player's state, since every answer
 * about what plays where is read through them. What is on show is the
 * player's own computed, so it is handed in (`withFeature`) — see
 * `withPlayerQueue` for why it is not the feature's input.
 */
export function withPlayerSettings(
	/** The kind of page the player is on, which the menu applies to. */
	shownContext: () => PlayerContext
) {
	return signalStoreFeature(
		{ state: type<{ overrides: PlayerSettingsOverrides }>() },
		withMethods((store, settingsEffect = inject(PlayerSettingsEffect)) => {
			const saveOverrides = (overrides: PlayerSettingsOverrides) => {
				patchState(store, { overrides });
				settingsEffect.save(overrides).catch((error) => {
					console.error('Player settings not saved', error);
				});
			};

			const updateFor = (
				context: PlayerContext,
				changes: Partial<PlayerSettings>
			) => {
				saveOverrides({
					...store.overrides(),
					[context]: { ...store.overrides()[context], ...changes },
				});
			};

			const resetFor = (context: PlayerContext) => {
				const overrides = { ...store.overrides() };

				delete overrides[context];
				saveOverrides(overrides);
			};

			return {
				/** Changes the settings of the shown kind of page and keeps them. */
				updateSettings(changes: Partial<PlayerSettings>): void {
					updateFor(shownContext(), changes);
				},

				/** Back to the defaults of the shown kind of page. */
				resetSettings(): void {
					resetFor(shownContext());
				},

				/**
				 * The same, for a kind of page that is not on show — the
				 * profile sets all of them at once.
				 */
				updateSettingsFor(
					context: PlayerContext,
					changes: Partial<PlayerSettings>
				): void {
					updateFor(context, changes);
				},

				resetSettingsFor(context: PlayerContext): void {
					resetFor(context);
				},

				loadSettings: rxMethod<void>(
					pipe(
						switchMap(() => settingsEffect.overrides$()),
						tap((overrides) => patchState(store, { overrides }))
					)
				),
			};
		})
	);
}
