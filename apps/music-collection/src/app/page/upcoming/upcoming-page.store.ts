import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { UpcomingReleaseEntity } from '@music-collection/api';
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

import { UpcomingReleaseEffect, today } from '../../data/upcoming-release';

import { hasVinyl, toKind, toMonths } from './upcoming.mapper';
import { UpcomingFilter } from './upcoming.model';

interface UpcomingPageState {
	isLoading: boolean;
	releases: UpcomingReleaseEntity[];
	filter: UpcomingFilter;
	/** Only records with a vinyl pressing among the formats. */
	vinylOnly: boolean;
}

const initialState: UpcomingPageState = {
	isLoading: true,
	releases: [],
	filter: 'all',
	vinylOnly: false,
};

export const UpcomingPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const visible = computed(() => {
			const filter = store.filter();
			const vinylOnly = store.vinylOnly();

			return store
				.releases()
				.filter(
					(release) =>
						(filter === 'all' || toKind(release) === filter) &&
						(!vinylOnly || hasVinyl(release.formats))
				);
		});

		return {
			visible,
			/** The timeline: months, and the days in them that have a record. */
			months: computed(() => toMonths(visible(), today())),
			newCount: computed(
				() =>
					store
						.releases()
						.filter((release) => toKind(release) === 'new').length
			),
			reissueCount: computed(
				() =>
					store
						.releases()
						.filter((release) => toKind(release) === 'reissue')
						.length
			),
			/** How many artists of the catalog have something coming. */
			artistCount: computed(
				() =>
					new Set(
						store
							.releases()
							.map(
								(release) =>
									release.artistUid ?? release.artistName
							)
					).size
			),
			/** Nothing is coming at all — different from nothing matching. */
			isEmpty: computed(
				() => !store.isLoading() && !store.releases().length
			),
			/** The filters hide everything there is. */
			isFilteredOut: computed(
				() =>
					!store.isLoading() &&
					!!store.releases().length &&
					!visible().length
			),
		};
	}),
	withMethods((store, effect = inject(UpcomingReleaseEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.list$()),
				tapResponse({
					next: (releases: UpcomingReleaseEntity[]) =>
						patchState(store, { releases, isLoading: false }),
					error: (error) => {
						console.error(error);
						patchState(store, { isLoading: false });
					},
				})
			)
		),
		setFilter: (filter: UpcomingFilter) => patchState(store, { filter }),
		toggleVinylOnly: () =>
			patchState(store, { vinylOnly: !store.vinylOnly() }),
	})),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
		},
	})
);
