import { exhaustMap, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	EntityUsage,
	ReleaseEntity,
	TRACK_FEATURE_KEY,
	isDeletable,
	isReleaseArchived,
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

import { ReleaseDeletionEffect } from './release-deletion.effect';

interface ReleaseDeletionState {
	/** The pressing the confirmation is open for; null while it is closed. */
	pending: ReleaseEntity | null;
	/** What holds it, null until the answer arrives. */
	usage: EntityUsage | null;
	isChecking: boolean;
	isWorking: boolean;
	error: string | null;
	/** Epoch milliseconds of the last finished write; null until one. */
	doneAt: number | null;
}

const initialState: ReleaseDeletionState = {
	pending: null,
	usage: null,
	isChecking: false,
	isWorking: false,
	error: null,
	doneAt: null,
};

/**
 * The confirmation behind the trash icon of the release list.
 *
 * Deleting a pressing is asked for twice, and the second question is worth
 * asking because the answer is not always the same: while nothing owns a
 * copy of it the pressing goes for good, and once somebody does, the only
 * thing left to offer is archiving. The dialog therefore opens on a
 * question to the server rather than on a sentence, and says what it found.
 */
export const ReleaseDeletionStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** Whether the pressing may be deleted at all, as far as we know. */
		canDelete: computed(() => {
			const usage = store.usage();

			return !!usage && isDeletable(usage);
		}),
		/** How many copies stand on shelves — the reason a delete is refused. */
		copyCount: computed(
			() =>
				store
					.usage()
					?.blocking.find(
						(hold) =>
							hold.featureKey === COLLECTION_ITEM_FEATURE_KEY
					)?.count ?? 0
		),
		/** How many of the pressing's own tracks would go with it. */
		trackCount: computed(
			() =>
				store
					.usage()
					?.cascading.find(
						(hold) => hold.featureKey === TRACK_FEATURE_KEY
					)?.count ?? 0
		),
		/** Whether the pending pressing is already off the forms. */
		isArchived: computed(() => {
			const release = store.pending();

			return !!release && isReleaseArchived(release);
		}),
	})),
	withMethods((store, effect = inject(ReleaseDeletionEffect)) => ({
		/**
		 * Opens the confirmation and asks what holds the pressing. The
		 * answer decides which of the two the dialog offers, so nothing is
		 * enabled until it is here.
		 */
		ask: rxMethod<ReleaseEntity>(
			pipe(
				tap((pending) =>
					patchState(store, {
						pending,
						usage: null,
						isChecking: true,
						error: null,
					})
				),
				switchMap((release) =>
					effect.usage$(release).pipe(
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
		 * Deletes the pressing. `exhaustMap`: a second click while the first
		 * delete is in flight is the same click, not another one.
		 */
		confirmDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isWorking: true, error: null })),
				exhaustMap(() => {
					const release = store.pending();

					return release ? effect.delete$(release) : of(undefined);
				}),
				tapResponse({
					next: () =>
						// The list redraws itself from the catalog sync; only
						// the dialog closes here.
						patchState(store, {
							...initialState,
							doneAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						// A pressing somebody owns arrives as
						// `RELEASE_IN_USE`, which the page has its own
						// sentence for: archive it instead.
						patchState(store, {
							isWorking: false,
							error: error.message,
						});
					},
				})
			)
		),

		/** Takes the pending pressing off the forms, or puts it back. */
		setArchived: rxMethod<boolean>(
			pipe(
				tap(() => patchState(store, { isWorking: true, error: null })),
				exhaustMap((archived) => {
					const release = store.pending();

					return release
						? effect.archive$(release, archived)
						: of(undefined);
				}),
				tapResponse({
					next: () =>
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
			)
		),
	}))
);
