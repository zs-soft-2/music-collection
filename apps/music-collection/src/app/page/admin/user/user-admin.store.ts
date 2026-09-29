import {
	combineLatest,
	exhaustMap,
	map,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	EffectivePermissions,
	Role,
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

import { RoleEffect, keepsAccess } from '../../../data/role';
import {
	ResyncResult,
	UserRoleEffect,
	danglingReferences,
	heldRoles,
	holdsRole,
	permissionsOf,
	roleReferences,
	userName,
	withRole,
} from '../../../data/user-role';

/** A user is refused their own last way back into the access pages. */
export const WOULD_LOCK_OUT = 'would-lock-out';

/** One line of the list: the user, and what their document points at. */
export interface UserRow {
	user: User;
	/** The roles of the catalog the user holds. */
	roles: Role[];
	/** References that name no role at all. */
	dangling: string[];
}

interface UserAdminState {
	users: User[];
	roles: Role[];
	isLoading: boolean;
	/** Free text the list is narrowed by: name, email or uid. */
	search: string;
	/**
	 * A role the list is narrowed to, by document id. Set from the query
	 * string, so the role page can link straight to who holds one.
	 */
	roleFilter: string | null;
	/** The user whose roles are being written, and the roles picked so far. */
	editor: { uid: string; roleIds: string[] } | null;
	/** The user whose effective permissions are on show. */
	opened: string | null;
	effective: EffectivePermissions | null;
	isEffectiveLoading: boolean;
	isSaving: boolean;
	isResyncing: boolean;
	resynced: ResyncResult | null;
	error: string | null;
	savedAt: number | null;
	/** The signed-in admin, so the page can refuse to lock them out. */
	myUid: string | null;
}

const initialState: UserAdminState = {
	users: [],
	roles: [],
	isLoading: true,
	search: '',
	roleFilter: null,
	editor: null,
	opened: null,
	effective: null,
	isEffectiveLoading: false,
	isSaving: false,
	isResyncing: false,
	resynced: null,
	error: null,
	savedAt: null,
	myUid: null,
};

/**
 * Admin: who holds which role.
 *
 * The only thing written here is the `roleIds` of a user document. What that
 * user may then do is worked out on the server — the trigger recomputes
 * `security/users/{uid}/effective_permissions`, and the rules, the Storage
 * rules and the client all read that. So the permissions shown next to a user
 * are read back from that document rather than added up from the roles here:
 * the page shows what the server agreed to, not what it expects.
 *
 * Saving refuses one thing: an admin taking their own way back out of their
 * own hands. Everything else on this page can be undone from this page.
 */
export const UserAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** The list as it is drawn: narrowed by the search, roles resolved. */
		rows: computed<UserRow[]>(() => {
			const roles = store.roles();
			const search = store.search().trim().toLocaleLowerCase();
			const filter = store.roleFilter();

			return store
				.users()
				.map((user) => ({
					user,
					roles: heldRoles(user, roles),
					dangling: danglingReferences(user, roles),
				}))
				.filter(
					(row) =>
						matches(row.user, search) &&
						(!filter ||
							row.roles.some((role) => role.uid === filter))
				);
		}),

		/** The role the list is narrowed to, once it is known by name. */
		filteredRole: computed(
			() =>
				store
					.roles()
					.find((role) => role.uid === store.roleFilter()) ?? null
		),

		/**
		 * Whether the admin doing the editing would still be able to open
		 * this page afterwards. Only their own row can fail it.
		 */
		keepsMyAccess: computed(() => {
			const edit = store.editor();

			if (!edit || edit.uid !== store.myUid()) {
				return true;
			}

			const picked = store
				.roles()
				.filter(
					(role) =>
						edit.roleIds.includes(role.uid) ||
						edit.roleIds.includes(role.name)
				);

			return keepsAccess(permissionsOf(picked));
		}),
	})),
	withMethods(
		(
			store,
			roleEffect = inject(RoleEffect),
			userEffect = inject(UserRoleEffect),
			authentication = inject(AuthenticationStateService)
		) => ({
			load: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() =>
						combineLatest({
							users: userEffect.users$,
							roles: roleEffect.roles$,
						})
					),
					tapResponse({
						next: ({ users, roles }) =>
							patchState(store, {
								users,
								roles,
								isLoading: false,
							}),
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

			/** Who is signed in, so their own row can be guarded. */
			readMe: rxMethod<void>(
				pipe(
					switchMap(() =>
						authentication.selectAuthenticatedUser$()
					),
					tapResponse({
						next: (user) =>
							patchState(store, { myUid: user?.uid ?? null }),
						error: (error: Error) => console.error(error),
					})
				)
			),

			setSearch: (search: string) => patchState(store, { search }),
			setRoleFilter: (roleFilter: string | null) =>
				patchState(store, { roleFilter }),

			edit: (user: User) =>
				patchState(store, {
					editor: {
						uid: user.uid,
						roleIds: [...roleReferences(user)],
					},
					error: null,
					savedAt: null,
				}),

			cancel: () => patchState(store, { editor: null, error: null }),

			/**
			 * Hands the user a role, or takes it back. The reference written
			 * is the role's document id; a name left over from an older write
			 * is dropped along the way, because a role named twice is a role
			 * that cannot be taken away in one go.
			 */
			toggleRole: (role: Role, granted: boolean) => {
				const edit = store.editor();

				if (!edit) return;

				patchState(store, {
					editor: {
						...edit,
						roleIds: withRole(edit.roleIds, role, granted),
					},
				});
			},

			/** Whether the row being edited holds the role, either spelling. */
			holds: (role: Role): boolean =>
				holdsRole(store.editor()?.roleIds ?? [], role),

			save: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, { isSaving: true, error: null })
					),
					exhaustMap(() => {
						const edit = store.editor();

						if (!edit) {
							return of(null);
						}

						// The button is disabled for it, but the refusal
						// lives here too: this is the only place the whole
						// picture is known for certain.
						if (!store.keepsMyAccess()) {
							patchState(store, { error: WOULD_LOCK_OUT });

							return of(null);
						}

						return userEffect
							.assign$(edit.uid, edit.roleIds)
							.pipe(map(() => edit));
					}),
					tapResponse({
						next: (saved) =>
							patchState(
								store,
								saved
									? {
											editor: null,
											isSaving: false,
											savedAt: Date.now(),
										}
									: { isSaving: false }
							),
						error: (error: Error) => {
							console.error(error);
							patchState(store, {
								isSaving: false,
								error: error.message,
							});
						},
					})
				)
			),

			/**
			 * Shows what the permission sync worked out for one user. Read on
			 * demand: the document is not listable, and it is the answer to a
			 * question an admin asks about one person at a time.
			 */
			open: rxMethod<string>(
				pipe(
					tap((uid) =>
						patchState(store, {
							opened: uid,
							effective: null,
							isEffectiveLoading: true,
						})
					),
					switchMap((uid) => userEffect.effectivePermissions$(uid)),
					tapResponse({
						next: (effective) =>
							patchState(store, {
								effective,
								isEffectiveLoading: false,
							}),
						error: (error: Error) => {
							console.error(error);
							patchState(store, {
								isEffectiveLoading: false,
								error: error.message,
							});
						},
					})
				)
			),
			close: () =>
				patchState(store, { opened: null, effective: null }),

			/**
			 * Recomputes every user's effective permissions. The triggers do
			 * this on their own; it is here for after a script wrote the
			 * database behind their back.
			 */
			resync: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, {
							isResyncing: true,
							resynced: null,
							error: null,
						})
					),
					exhaustMap(() => userEffect.resync$()),
					tapResponse({
						next: (resynced) =>
							patchState(store, {
								resynced,
								isResyncing: false,
							}),
						error: (error: Error) => {
							console.error(error);
							patchState(store, {
								isResyncing: false,
								error: error.message,
							});
						},
					})
				)
			),
		})
	),
	withHooks({
		onInit: (store) => {
			store.readMe();
			store.load();
		},
	})
);

/** Whether the user answers to the search: name, email or uid. */
function matches(user: User, search: string): boolean {
	if (!search) return true;

	return [user.displayName, user.email, user.uid, userName(user)].some(
		(field) => (field ?? '').toLocaleLowerCase().includes(search)
	);
}
