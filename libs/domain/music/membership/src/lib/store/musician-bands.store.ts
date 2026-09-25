import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { MembershipEntity } from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { MembershipEffect } from '../data/membership.effect';

interface MusicianBandsState {
	rows: MembershipEntity[];
	isLoading: boolean;
	error: string | null;
}

const initialState: MusicianBandsState = {
	rows: [],
	isLoading: true,
	error: null,
};

/**
 * Admin: the bands a musician played in. Read only — a line-up is edited
 * from the band's own page, where the rest of it is visible next to it.
 */
export const MusicianBandsStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		bands: computed(() =>
			[...store.rows()].sort(
				(a, b) =>
					Number(!!b.active) - Number(!!a.active) ||
					(a.from ?? 9999) - (b.from ?? 9999) ||
					a.artistName.localeCompare(b.artistName)
			)
		),
	})),
	withMethods((store, effect = inject(MembershipEffect)) => ({
		load: rxMethod<string>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap((musicianUid) => effect.loadByMusician$(musicianUid)),
				tapResponse({
					next: (rows) =>
						patchState(store, { rows, isLoading: false }),
					error: (error) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: 'ui.musicianBands.error-general',
						});
					},
				})
			)
		),
	}))
);
