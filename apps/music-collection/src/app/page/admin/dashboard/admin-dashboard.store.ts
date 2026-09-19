import { combineLatest, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	EntityCounts,
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
	counts: EntityCounts;
	loading: boolean;
}

export interface AdminDashboardTile extends AdminNavItem {
	count: number | null;
}

const initialState: AdminDashboardState = {
	counts: {},
	loading: true,
};

const COUNTED_ITEMS = ADMIN_NAV.flatMap((group) => group.items).filter(
	(item) => !!item.countType
);

/** A vezérlőpult állapota: élő entitás-számok az admin menü szerint. */
export const AdminDashboardStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		tiles: computed<AdminDashboardTile[]>(() =>
			COUNTED_ITEMS.map((item) => ({
				...item,
				count: store.counts()[item.countType ?? ''] ?? null,
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
					tap(() =>
						quantityState.dispatchCountEntitiesAction(
							COUNTED_ITEMS.map((item) => item.countType ?? '')
						)
					),
					switchMap(() =>
						combineLatest([
							quantityState.selectEntityCounts$(),
							quantityState.selectEntityCountsLoading$(),
						])
					),
					tapResponse({
						next: ([counts, loading]) =>
							patchState(store, { counts, loading }),
						error: () => patchState(store, { loading: false }),
					})
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
