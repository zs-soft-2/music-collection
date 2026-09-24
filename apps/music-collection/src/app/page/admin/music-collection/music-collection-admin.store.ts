import { exhaustMap, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { TextService } from '@music-collection/core/i18n';
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

import { describeWriteError } from './music-collection-admin.errors';
import { toRows } from './music-collection-admin.mapper';
import { CollectionRow } from './music-collection-admin.model';

export type StatusFilter = 'all' | 'draft' | 'published';

interface MusicCollectionAdminState {
	rows: CollectionRow[];
	isLoading: boolean;
	statusFilter: StatusFilter;
	/** The collection the delete confirmation is open for. */
	pendingDeletion: CollectionRow | null;
	/** The collection being deleted. */
	busyUid: string | null;
	error: string | null;
}

const initialState: MusicCollectionAdminState = {
	rows: [],
	isLoading: true,
	statusFilter: 'all',
	pendingDeletion: null,
	busyUid: null,
	error: null,
};

/** Admin: the collection definitions, with what each one catches. */
export const MusicCollectionAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		visibleRows: computed(() => {
			const status = store.statusFilter();

			return status === 'all'
				? store.rows()
				: store.rows().filter((row) => row.status === status);
		}),
		counts: computed(() => {
			const counts = { all: 0, draft: 0, published: 0 };

			for (const row of store.rows()) {
				counts[row.status] += 1;
				counts.all += 1;
			}

			return counts;
		}),
	})),
	withMethods(
		(
			store,
			effect = inject(MusicCollectionEffect),
			text = inject(TextService)
		) => ({
			load: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() => effect.listAllResolutions$()),
					tapResponse({
						next: (resolutions) =>
							patchState(store, {
								rows: toRows(resolutions, text.translator()),
								isLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								isLoading: false,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
			setStatusFilter: (statusFilter: StatusFilter) =>
				patchState(store, { statusFilter }),
			/**
			 * Deleting is asked for twice: the definition is what a badge is
			 * measured against, and it cannot be brought back from the client.
			 */
			askDeletion: (pendingDeletion: CollectionRow) =>
				patchState(store, { pendingDeletion, error: null }),
			cancelDeletion: () => patchState(store, { pendingDeletion: null }),
			confirmDeletion: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, {
							busyUid: store.pendingDeletion()?.uid ?? null,
							error: null,
						})
					),
					exhaustMap(() => {
						const uid = store.pendingDeletion()?.uid;

						return uid ? effect.delete$(uid) : of(undefined);
					}),
					tapResponse({
						next: () =>
							// A törölt definíció a cache-ből is kiesik, a lista
							// magától újrarajzolódik — csak a párbeszéd zárul itt.
							patchState(store, {
								pendingDeletion: null,
								busyUid: null,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								busyUid: null,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
		},
	})
);
