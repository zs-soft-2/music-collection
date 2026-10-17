import { exhaustMap, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	COLLECTION_ITEM_FEATURE_KEY,
	EntityUsage,
	EntityUsageHold,
	RELEASE_FEATURE_KEY,
	TRACK_FEATURE_KEY,
	isDeletable,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { AlbumDeletionEffect } from './album-deletion.effect';

interface AlbumDeletionState {
	/** The album the confirmation is open for; null while it is closed. */
	pending: AlbumEntity | null;
	/** What holds it, null until the answer arrives. */
	usage: EntityUsage | null;
	isChecking: boolean;
	isWorking: boolean;
	error: string | null;
	/** Epoch milliseconds of the last finished delete; null until one. */
	doneAt: number | null;
}

const initialState: AlbumDeletionState = {
	pending: null,
	usage: null,
	isChecking: false,
	isWorking: false,
	error: null,
	doneAt: null,
};

const countOf = (holds: EntityUsageHold[] | undefined, featureKey: string) =>
	holds?.find((hold) => hold.featureKey === featureKey)?.count ?? 0;

/**
 * The confirmation behind the trash icon of the album list. It opens on a
 * question to the server and says what it found: how many pressings, tracks
 * and of the admin's own copies go with the album, or how many copies on
 * other shelves stand in the way.
 */
export const AlbumDeletionStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** Whether the album may be deleted at all, as far as we know. */
		canDelete: computed(() => {
			const usage = store.usage();

			return !!usage && isDeletable(usage);
		}),
		/** Copies on other collectors' shelves — why a delete is refused. */
		foreignCopyCount: computed(() =>
			countOf(store.usage()?.blocking, COLLECTION_ITEM_FEATURE_KEY)
		),
		/** The admin's own copies, which go with the album. */
		ownCopyCount: computed(() =>
			countOf(store.usage()?.cascading, COLLECTION_ITEM_FEATURE_KEY)
		),
		releaseCount: computed(() =>
			countOf(store.usage()?.cascading, RELEASE_FEATURE_KEY)
		),
		trackCount: computed(() =>
			countOf(store.usage()?.cascading, TRACK_FEATURE_KEY)
		),
	})),
	withMethods((store, effect = inject(AlbumDeletionEffect)) => ({
		/** Opens the confirmation and asks what holds the album. */
		ask: rxMethod<AlbumEntity>(
			pipe(
				tap((pending) =>
					patchState(store, {
						pending,
						usage: null,
						isChecking: true,
						error: null,
					})
				),
				switchMap((album) =>
					effect.usage$(album).pipe(
						tapResponse({
							next: (usage) =>
								patchState(store, {
									usage,
									isChecking: false,
								}),
							error: (error: Error) => {
								console.error(error);
								patchState(store, {
									isChecking: false,
									error: error.message,
								});
							},
						})
					)
				)
			)
		),

		cancel: () => patchState(store, { ...initialState }),

		/**
		 * Deletes the album. `exhaustMap`: a second click while the first
		 * delete is in flight is the same click. The error is caught per
		 * request, so a refused delete does not silence the next one.
		 */
		confirmDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isWorking: true, error: null })),
				exhaustMap(() => {
					const album = store.pending();

					return (album ? effect.delete$(album) : of(undefined)).pipe(
						tapResponse({
							next: () =>
								// The list redraws itself from the catalog
								// sync; only the dialog closes here.
								patchState(store, {
									...initialState,
									doneAt: Date.now(),
								}),
							error: (error: Error) => {
								console.error(error);
								patchState(store, {
									isWorking: false,
									error: error.message,
								});
							},
						})
					);
				})
			)
		),
	}))
);
