import { combineLatest, map, of, pipe, startWith, switchMap } from 'rxjs';

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
import { RequestEffect } from '../../data/request';
import { AdminNavItem } from './admin-nav';

type AdminBadges = Record<NonNullable<AdminNavItem['badge']>, number>;

const NONE: AdminBadges = { pendingRequests: 0 };

/** Az admin héj állapota: a menüpontok melletti teendő-számok. */
export const AdminStore = signalStore(
	withState<{ badges: AdminBadges }>({ badges: NONE }),
	withMethods(
		(
			store,
			releaseRequestEffect = inject(ReleaseRequestEffect),
			requestEffect = inject(RequestEffect)
		) => ({
			loadBadges: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest({
							// Egy néma lekérdezés az egész menüt megfogná: a
							// `combineLatest` addig nem emittál, amíg
							// mindegyik ága nem szólt legalább egyszer.
							releaseRequests: releaseRequestEffect
								.countPending$()
								.pipe(startWith(0)),
							requests: requestEffect
								.countPending$()
								.pipe(startWith(0)),
						})
					),
					// A kétféle kérés egy listában van, így egy szám is: az
					// admin egy helyen dolgozza le őket.
					map(({ releaseRequests, requests }) => ({
						pendingRequests: releaseRequests + requests,
					})),
					tapResponse({
						next: (badges) => patchState(store, { badges }),
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
