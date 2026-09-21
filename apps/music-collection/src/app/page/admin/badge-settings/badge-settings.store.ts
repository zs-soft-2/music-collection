import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { BadgeGenerationSettings } from '@music-collection/domain/music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { describeWriteError } from '../music-collection/music-collection-admin.errors';

/** What the server falls back to; shown until the real values arrive. */
const FALLBACK: BadgeGenerationSettings = {
	enabled: true,
	model: 'imagen-4.0-generate-001',
	location: 'us-central1',
	candidateCount: 4,
	dailyImageLimit: 200,
};

/** The server clamps these too; the form refuses the obvious nonsense first. */
const MAX_CANDIDATES = 8;
const MAX_DAILY_IMAGES = 2000;

interface BadgeSettingsState {
	settings: BadgeGenerationSettings;
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
	/** Epoch milliseconds of the last successful save; null until one. */
	savedAt: number | null;
}

const initialState: BadgeSettingsState = {
	settings: FALLBACK,
	isLoading: true,
	isSaving: false,
	error: null,
	savedAt: null,
};

/**
 * Admin: how badges get generated — which model, in which region, how many
 * candidates to draw, and what a day may cost.
 *
 * What is deliberately absent: the style lock and the style version. Those
 * are the only reason a shelf of badges reads as one set, so they stay in
 * code, versioned, where a change means regenerating all of them rather
 * than quietly drifting one badge at a time.
 */
export const BadgeSettingsStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		canSave: computed(
			() => !store.isSaving() && !!store.settings().model.trim()
		),
	})),
	withMethods((store, effect = inject(MusicCollectionEffect)) => {
		const load = rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true, error: null })),
				switchMap(() => effect.readBadgeSettings$()),
				tapResponse({
					next: (settings) =>
						patchState(store, { settings, isLoading: false }),
					error: (error: unknown) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: describeWriteError(error),
						});
					},
				})
			)
		);

		return {
			load,
			set(change: Partial<BadgeGenerationSettings>): void {
				patchState(store, {
					settings: { ...store.settings(), ...change },
					error: null,
				});
			},
			setNumber(
				key: 'candidateCount' | 'dailyImageLimit',
				value: string
			): void {
				const max =
					key === 'candidateCount'
						? MAX_CANDIDATES
						: MAX_DAILY_IMAGES;
				const parsed = Number.parseInt(value, 10);

				patchState(store, {
					settings: {
						...store.settings(),
						[key]: Number.isFinite(parsed)
							? Math.min(Math.max(parsed, 1), max)
							: store.settings()[key],
					},
					error: null,
				});
			},
			save: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, { isSaving: true, error: null })
					),
					switchMap(() =>
						effect.updateBadgeSettings$(store.settings())
					),
					tapResponse({
						next: (settings) =>
							patchState(store, {
								// The server clamps, so what it returns is the
								// truth — not what the form sent.
								settings,
								isSaving: false,
								savedAt: Date.now(),
							}),
						error: (error: unknown) => {
							console.error(error);
							patchState(store, {
								isSaving: false,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
		};
	}),
	withHooks({
		onInit(store) {
			store.load();
		},
	})
);
