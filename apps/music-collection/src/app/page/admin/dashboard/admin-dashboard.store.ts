import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	EntityQuantityEntity,
	EntityQuantityStateService,
} from '@music-collection/api';
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

import { ADMIN_NAV, AdminNavItem } from '../admin-nav';

interface AdminDashboardState {
	quantities: EntityQuantityEntity[];
	loading: boolean;
}

export interface AdminDashboardTile extends AdminNavItem {
	count: number | null;
}

const initialState: AdminDashboardState = {
	quantities: [],
	loading: true,
};

/** A vezérlőpult állapota: az entitás-számlálók az admin menü szerint. */
export const AdminDashboardStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		tiles: computed<AdminDashboardTile[]>(() =>
			ADMIN_NAV.flatMap((group) => group.items)
				.filter((item) => !!item.quantityType)
				.map((item) => ({
					...item,
					count: store.loading()
						? null
						: (store
								.quantities()
								.find(
									(quantity) =>
										quantity.type === item.quantityType
								)?.quantity ?? 0),
				}))
		),
		quickActions: computed(() =>
			ADMIN_NAV.flatMap((group) => group.items).filter(
				(item) => !!item.createLabel
			)
		),
	})),
	withMethods(
		(store, quantityState = inject(EntityQuantityStateService)) => ({
			load: rxMethod<void>(
				pipe(
					tap(() => quantityState.dispatchListEntitiesAction()),
					switchMap(() =>
						quantityState.selectEntities$().pipe(
							tapResponse({
								next: (quantities) =>
									patchState(store, {
										quantities,
										loading: false,
									}),
								error: () =>
									patchState(store, { loading: false }),
							})
						)
					)
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.load();
		},
	})
);
