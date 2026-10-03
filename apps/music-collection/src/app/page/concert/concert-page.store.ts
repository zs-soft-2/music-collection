import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ConcertEntity, VenueEntity } from '@music-collection/api';
import { ConcertEffect, concertDay } from '@music-collection/domain/concert';
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

import { toCities, toMonths } from './concert.mapper';
import { ConcertFilter } from './concert.model';

type ConcertRow = { concert: ConcertEntity; venue: VenueEntity | null };

interface ConcertPageState {
	isLoading: boolean;
	/** Every concert still to come, with the venue it is held at. */
	rows: ConcertRow[];
	filter: ConcertFilter;
	/** The city the list is narrowed to; empty is every city. */
	city: string;
}

const initialState: ConcertPageState = {
	isLoading: true,
	rows: [],
	filter: 'all',
	city: '',
};

export const ConcertPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const visible = computed(() => {
			const filter = store.filter();
			const city = store.city();

			return store.rows().filter(({ concert, venue }) => {
				const inCity = !city || (venue?.city ?? concert.city) === city;

				return (
					inCity && (filter === 'all' || concert.eventType === filter)
				);
			});
		});

		return {
			visible,
			/** The timeline: months, and the days in them that have a night. */
			months: computed(() => toMonths(visible(), concertDay())),
			/** The cities to choose from — those that actually have a concert. */
			cities: computed(() => toCities(store.rows())),
			/** How many bands of the catalog are playing at all. */
			artistCount: computed(
				() =>
					new Set(store.rows().map((row) => row.concert.artistUid))
						.size
			),
			festivalCount: computed(
				() =>
					store
						.rows()
						.filter((row) => row.concert.eventType === 'festival')
						.length
			),
			/** Nothing is coming at all — different from nothing matching. */
			isEmpty: computed(() => !store.isLoading() && !store.rows().length),
			/** The filters hide everything there is. */
			isFilteredOut: computed(
				() =>
					!store.isLoading() &&
					!!store.rows().length &&
					!visible().length
			),
		};
	}),
	withMethods((store, effect = inject(ConcertEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.comingWithVenue$()),
				tapResponse({
					next: (rows: ConcertRow[]) =>
						patchState(store, { rows, isLoading: false }),
					error: (error) => {
						console.error(error);
						patchState(store, { isLoading: false });
					},
				})
			)
		),
		setFilter: (filter: ConcertFilter) => patchState(store, { filter }),
		setCity: (city: string) => patchState(store, { city }),
	})),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
		},
	})
);
