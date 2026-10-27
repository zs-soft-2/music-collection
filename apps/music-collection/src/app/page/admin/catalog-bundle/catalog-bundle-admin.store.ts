import { exhaustMap, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
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
	CatalogBundleEffect,
	CatalogBundleRebuildResult,
	CatalogBundleStatus,
	catalogBundleId,
	catalogBundleState,
} from '../../../data/catalog-bundle';
import { describeWriteError } from '../music-collection/music-collection-admin.errors';

/** What a finished rebuild left behind, for the line under its row. */
export interface CatalogBundleRebuilt {
	result: CatalogBundleRebuildResult;
	/** How long the server took, in milliseconds. */
	tookMs: number;
}

interface CatalogBundleAdminState {
	bundles: CatalogBundleStatus[];
	isLoading: boolean;
	error: string | null;
	/** Epoch ms of the last count. */
	checkedAt: number | null;
	/** The row whose rebuild is waiting to be confirmed. */
	pendingRebuild: string | null;
	/** The row being rebuilt — one at a time, the server reads a lot. */
	rebuilding: string | null;
	rebuilt: Record<string, CatalogBundleRebuilt>;
	failures: Record<string, string>;
}

const initialState: CatalogBundleAdminState = {
	bundles: [],
	isLoading: true,
	error: null,
	checkedAt: null,
	pendingRebuild: null,
	rebuilding: null,
	rebuilt: {},
	failures: {},
};

/**
 * Admin: the catalog bundles, how far behind the catalog each has fallen,
 * and rebuilding one by hand instead of waiting for the night or running a
 * script.
 *
 * A rebuild asks first, and says what it costs: a genre bundle reads the
 * whole catalog, tens of thousands of documents, and nothing on the page
 * should spend that on a stray click.
 */
export const CatalogBundleAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		guest: computed(() =>
			store.bundles().filter((bundle) => bundle.kind === 'guest')
		),
		genres: computed(() =>
			store.bundles().filter((bundle) => bundle.kind === 'genre')
		),
		features: computed(() =>
			store.bundles().filter((bundle) => bundle.kind === 'feature')
		),
		/** How many published bundles want rebuilding. */
		behindCount: computed(
			() =>
				store
					.bundles()
					.filter((bundle) =>
						['reset', 'behind'].includes(catalogBundleState(bundle))
					).length
		),
	})),
	withMethods((store, effect = inject(CatalogBundleEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true, error: null })),
				switchMap(() =>
					effect.status$().pipe(
						tapResponse({
							next: (bundles) =>
								patchState(store, {
									bundles,
									isLoading: false,
									checkedAt: Date.now(),
								}),
							error: (error: unknown) =>
								patchState(store, {
									isLoading: false,
									error: describeWriteError(error),
								}),
						})
					)
				)
			)
		),

		askRebuild(bundle: CatalogBundleStatus): void {
			patchState(store, { pendingRebuild: catalogBundleId(bundle) });
		},

		cancelRebuild(): void {
			patchState(store, { pendingRebuild: null });
		},
	})),
	withMethods((store, effect = inject(CatalogBundleEffect)) => ({
		confirmRebuild: rxMethod<void>(
			pipe(
				exhaustMap(() => {
					const id = store.pendingRebuild();
					const bundle = store
						.bundles()
						.find((candidate) => catalogBundleId(candidate) === id);
					const startedAt = Date.now();

					if (!id || !bundle) {
						return [];
					}

					const failures = Object.fromEntries(
						Object.entries(store.failures()).filter(
							([key]) => key !== id
						)
					);

					patchState(store, {
						pendingRebuild: null,
						rebuilding: id,
						failures,
					});

					return effect.rebuild$(bundle.kind, bundle.key).pipe(
						tapResponse({
							next: (result) => {
								patchState(store, {
									rebuilding: null,
									rebuilt: {
										...store.rebuilt(),
										[id]: {
											result,
											tookMs: Date.now() - startedAt,
										},
									},
								});
								// The counts start again from the new build.
								store.load();
							},
							error: (error: unknown) =>
								patchState(store, {
									rebuilding: null,
									failures: {
										...store.failures(),
										[id]: describeWriteError(error),
									},
								}),
						})
					);
				})
			)
		),
	})),
	withHooks({
		onInit: (store) => store.load(),
	})
);
