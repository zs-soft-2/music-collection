import { exhaustMap, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	ReleaseEntity,
	ReleaseRequest,
	ReleaseStateService,
	User,
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

import { ReleaseRequestEffect } from '../../../data/release-request';
import {
	StatusFilter,
	toReleaseRequestRows,
} from './release-request-admin.mapper';

interface ReleaseRequestAdminState {
	requests: ReleaseRequest[];
	users: User[];
	releases: ReleaseEntity[];
	loading: boolean;
	statusFilter: StatusFilter;
	adminUid: string | null;
	/** The request being approved or rejected. */
	busyId: string | null;
	/** Failed decisions by request id. */
	errors: Record<string, string>;
}

const initialState: ReleaseRequestAdminState = {
	requests: [],
	users: [],
	releases: [],
	loading: true,
	statusFilter: 'pending',
	adminUid: null,
	busyId: null,
	errors: {},
};

const ERRORS: Record<string, string> = {
	'not-found':
		'Not found: the request, its album, the release or the Discogs release.',
	'failed-precondition':
		'Already decided — or it has no Discogs release: link a catalog release.',
	'permission-denied': 'Only an admin may decide requests.',
	unavailable: 'Discogs cannot be reached right now. Try again later.',
	'resource-exhausted': 'Discogs is busy right now. Try again in a minute.',
};

function describeError(error: unknown): string {
	const code = ((error as { code?: string })?.code ?? '').replace(
		/^functions\//,
		''
	);
	return ERRORS[code] ?? 'Something went wrong. Try again later.';
}

/** Admin: the release requests of the collectors, to approve or reject. */
export const ReleaseRequestAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const rows = computed(() =>
			toReleaseRequestRows(
				store.requests(),
				store.users(),
				store.releases()
			)
		);

		return {
			rows: computed(() => {
				const status = store.statusFilter();
				return status === 'all'
					? rows()
					: rows().filter((row) => row.status === status);
			}),
			counts: computed(() => {
				const counts = { pending: 0, approved: 0, rejected: 0, all: 0 };
				for (const request of store.requests()) {
					counts[request.status] += 1;
					counts.all += 1;
				}
				return counts;
			}),
		};
	}),
	withMethods(
		(
			store,
			releaseRequestEffect = inject(ReleaseRequestEffect),
			releaseStateService = inject(ReleaseStateService),
			authenticationStateService = inject(AuthenticationStateService)
		) => {
			const setError = (id: string, error: string | null) => {
				const errors = { ...store.errors() };
				if (error) {
					errors[id] = error;
				} else {
					delete errors[id];
				}
				patchState(store, { errors });
			};

			return {
				load: rxMethod<void>(
					pipe(
						switchMap(() => releaseRequestEffect.listAll$()),
						tapResponse({
							next: (requests) =>
								patchState(store, { requests, loading: false }),
							error: (error) => {
								console.error(error);
								patchState(store, { loading: false });
							},
						})
					)
				),
				loadUsers: rxMethod<void>(
					pipe(
						switchMap(() => releaseRequestEffect.listUsers$()),
						tapResponse({
							next: (users) => patchState(store, { users }),
							error: (error) => console.error(error),
						})
					)
				),
				/** The catalog releases, to approve with one of the album's. */
				loadReleases: rxMethod<void>(
					pipe(
						switchMap(() => releaseStateService.selectEntities$()),
						tap((releases) => {
							if (!releases.length) {
								releaseStateService.dispatchListEntitiesAction();
							}
						}),
						tapResponse({
							next: (releases) => patchState(store, { releases }),
							error: (error) => console.error(error),
						})
					)
				),
				loadAdmin: rxMethod<void>(
					pipe(
						switchMap(() =>
							authenticationStateService.selectAuthenticatedUser$()
						),
						tap((user) =>
							patchState(store, { adminUid: user?.uid || null })
						)
					)
				),
				setStatusFilter(statusFilter: StatusFilter): void {
					patchState(store, { statusFilter });
				},
				approve: rxMethod<{ id: string; releaseUid: string | null }>(
					pipe(
						filter(() => !store.busyId()),
						tap(({ id }) => {
							patchState(store, { busyId: id });
							setError(id, null);
						}),
						exhaustMap(({ id, releaseUid }) =>
							releaseRequestEffect.approve$(id, releaseUid).pipe(
								tapResponse({
									next: () =>
										patchState(store, { busyId: null }),
									error: (error) => {
										console.error(error);
										patchState(store, { busyId: null });
										setError(id, describeError(error));
									},
								})
							)
						)
					)
				),
				reject: rxMethod<{ id: string; note: string | null }>(
					pipe(
						filter(() => !store.busyId() && !!store.adminUid()),
						tap(({ id }) => {
							patchState(store, { busyId: id });
							setError(id, null);
						}),
						map(({ id, note }) => ({
							id,
							reject$: releaseRequestEffect.reject$(
								id,
								note,
								store.adminUid() ?? ''
							),
						})),
						exhaustMap(({ id, reject$ }) =>
							reject$.pipe(
								tapResponse({
									next: () =>
										patchState(store, { busyId: null }),
									error: (error) => {
										console.error(error);
										patchState(store, { busyId: null });
										setError(id, describeError(error));
									},
								})
							)
						)
					)
				),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadUsers(of(undefined));
			store.loadReleases(of(undefined));
			store.loadAdmin(of(undefined));
		},
	})
);
