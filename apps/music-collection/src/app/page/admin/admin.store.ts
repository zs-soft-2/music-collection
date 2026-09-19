import { of, pipe, switchMap } from 'rxjs';

import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ReleaseRequestEffect } from '../../data/release-request';
import { AdminNavItem } from './admin-nav';

type AdminBadges = Record<NonNullable<AdminNavItem['badge']>, number>;

/** Az admin héj állapota: a menüpontok melletti teendő-számok. */
export const AdminStore = signalStore(
	withState<{ badges: AdminBadges }>({
		badges: { pendingReleaseRequests: 0 },
	}),
	withMethods(
		(store, releaseRequestEffect = inject(ReleaseRequestEffect)) => ({
			loadBadges: rxMethod<void>(
				pipe(
					switchMap(() => releaseRequestEffect.countPending$()),
					tapResponse({
						next: (pendingReleaseRequests) =>
							patchState(store, {
								badges: { pendingReleaseRequests },
							}),
						error: (error) => console.error(error),
					})
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.loadBadges(of(undefined));
		},
	})
);
