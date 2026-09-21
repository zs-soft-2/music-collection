import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { AuthenticationStateService } from '@music-collection/api';
import { FeatureCollection } from 'geojson';
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

import {
	PublicUserLocation,
	UserLocationEffect,
} from '../../data/user-location';
import { WorldAtlasEffect } from '../../data/world-atlas';
import { WorldMapPin } from '../../shared/world-map';

import { MapCountry, toMapCountries } from './map.mapper';

interface MapPageState {
	locations: PublicUserLocation[];
	/** The outline of the world; null until it is loaded. */
	land: FeatureCollection | null;
	isAuthenticated: boolean;
	loading: boolean;
	/** The country whose collectors the panel lists. */
	selectedCode: string | null;
}

const initialState: MapPageState = {
	locations: [],
	land: null,
	isAuthenticated: false,
	loading: true,
	selectedCode: null,
};

/**
 * The collectors who chose to be on the map. Only what they shared is here:
 * the documents this reads hold nothing else.
 */
export const MapPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const countries = computed(() => toMapCountries(store.locations()));

		return {
			countries,
			collectorCount: computed(() => store.locations().length),
			countryCount: computed(() => countries().length),
			pins: computed<WorldMapPin[]>(() =>
				countries().map((country) => ({
					id: country.code,
					position: country.position,
					label: `${country.name}: ${country.count} ${
						country.count === 1 ? 'collector' : 'collectors'
					}`,
					count: country.count,
				}))
			),
			selected: computed<MapCountry | null>(
				() =>
					countries().find(
						(country) => country.code === store.selectedCode()
					) ?? null
			),
		};
	}),
	withMethods(
		(
			store,
			locations = inject(UserLocationEffect),
			atlas = inject(WorldAtlasEffect),
			authentication = inject(AuthenticationStateService)
		) => ({
			/** The shared locations, once it is known who is asking. */
			load: rxMethod<void>(
				pipe(
					switchMap(() => authentication.selectIsAuthenticated$()),
					tap((isAuthenticated) =>
						patchState(store, { isAuthenticated })
					),
					switchMap((isAuthenticated) =>
						isAuthenticated
							? locations.shared$()
							: of([] as PublicUserLocation[])
					),
					tapResponse({
						next: (shared: PublicUserLocation[]) =>
							patchState(store, {
								locations: shared,
								loading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { loading: false });
						},
					})
				)
			),

			loadLand: rxMethod<void>(
				pipe(
					switchMap(() => atlas.land$()),
					tapResponse({
						next: (land: FeatureCollection) =>
							patchState(store, { land }),
						error: (error) => console.error(error),
					})
				)
			),

			/** Opens a country, or closes the one already open. */
			select(code: string): void {
				patchState(store, {
					selectedCode: store.selectedCode() === code ? null : code,
				});
			},

			clearSelection(): void {
				patchState(store, { selectedCode: null });
			},

			login(): void {
				authentication.dispatchLogin();
			},
		})
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadLand(of(undefined));
		},
	})
);
