import { exhaustMap, forkJoin, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { Role } from '@music-collection/api';
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
	ROLE_IN_USE,
	RoleCoverage,
	RoleEffect,
	RoleInUseError,
	describeRole,
	hasWildcard,
} from '../../../data/role';

/** One line of the list. */
export interface RoleRow {
	role: Role;
	/** How much of each group of the catalog it carries. */
	coverage: RoleCoverage[];
	/** How many users hold it; null while unknown or unreadable. */
	holders: number | null;
	isWildcard: boolean;
}

interface RoleAdminState {
	roles: Role[];
	/** How many users hold each role, by document id. */
	holders: Record<string, number | null>;
	isLoading: boolean;
	/** The role the delete confirmation is open for. */
	pendingDeletion: Role | null;
	isDeleting: boolean;
	error: string | null;
}

const initialState: RoleAdminState = {
	roles: [],
	holders: {},
	isLoading: true,
	pendingDeletion: null,
	isDeleting: false,
	error: null,
};

/**
 * Admin: the roles there are.
 *
 * The list says two things a count of permissions never could. How much of
 * each part of the collection a role reaches, so that "catalog editor" and
 * "collector" are told apart at a glance — and how many people hold it, which
 * is what makes editing or deleting one a bigger act than it looks.
 *
 * The editing itself lives on a page of its own: a role is a hundred-odd
 * checkboxes, and a panel that size would push this list off the screen.
 */
export const RoleAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		rows: computed<RoleRow[]>(() =>
			store.roles().map((role) => ({
				coverage: describeRole(role.permissions ?? []),
				holders: store.holders()[role.uid] ?? null,
				isWildcard: hasWildcard(role.permissions ?? []),
				role,
			}))
		),

		/** How many users hold the role about to be deleted. */
		pendingHolders: computed(() => {
			const role = store.pendingDeletion();

			return role ? (store.holders()[role.uid] ?? null) : null;
		}),
	})),
	withMethods((store, effect = inject(RoleEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.roles$),
				tapResponse({
					next: (roles) =>
						patchState(store, { roles, isLoading: false }),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: error.message,
						});
					},
				})
			)
		),

		/**
		 * How many users hold each role. One aggregation query apiece — a few
		 * reads for the whole page, and the answer is what the delete button
		 * turns on, so it has to come from the server rather than from a
		 * cached list of users this page never downloads.
		 */
		countHolders: rxMethod<Role[]>(
			pipe(
				switchMap((roles) =>
					roles.length
						? forkJoin(
								roles.map((role) =>
									effect
										.countHolders$(role)
										.pipe(
											switchMap((count) =>
												of([role.uid, count] as const)
											)
										)
								)
							)
						: of([] as (readonly [string, number | null])[])
				),
				tapResponse({
					next: (counts) =>
						patchState(store, {
							holders: Object.fromEntries(counts),
						}),
					error: (error: Error) => console.error(error),
				})
			)
		),

		askDeletion: (pendingDeletion: Role) =>
			patchState(store, { pendingDeletion, error: null }),
		cancelDeletion: () => patchState(store, { pendingDeletion: null }),

		/**
		 * Deleting is asked for twice, and the second time the server is asked
		 * again: the count on screen may be a minute old, and a role deleted
		 * out from under its holders leaves them pointing at nothing.
		 */
		confirmDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isDeleting: true, error: null })),
				exhaustMap(() => {
					const role = store.pendingDeletion();

					return role ? effect.delete$(role) : of(undefined);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							pendingDeletion: null,
							isDeleting: false,
						}),
					error: (error: Error) => {
						console.error(error);

						const role = store.pendingDeletion();

						patchState(store, {
							isDeleting: false,
							// A role somebody took in the meantime comes back
							// as the count the server saw; the page says so,
							// and the row learns the new number.
							error:
								error instanceof RoleInUseError
									? ROLE_IN_USE
									: error.message,
							holders:
								error instanceof RoleInUseError && role
									? {
											...store.holders(),
											[role.uid]: error.holders,
										}
									: store.holders(),
						});
					},
				})
			)
		),
	})),
	withHooks({
		onInit: (store) => {
			store.load();
			// The counts follow the list: a role added or deleted elsewhere
			// brings its own number with it.
			store.countHolders(store.roles);
		},
	})
);
