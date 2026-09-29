import { exhaustMap, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Role, RoleDraft } from '@music-collection/api';
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
import { NgxRolesService } from 'ngx-permissions';

import {
	PermissionGroup,
	RoleEffect,
	hasErrors,
	hasWildcard,
	isEmptyDiff,
	permissionDiff,
	searchCatalog,
	toRoleId,
	unknownPermissions,
	validateRole,
} from '../../../../data/role';
import { PermissionToggle } from '../component/permission-grid.component';

/** What the editor opens on. */
export interface RoleEditTarget {
	/** The role to edit; null when one is being added. */
	uid: string | null;
	/** A role to copy the permissions of, when one is being added. */
	from: string | null;
}

const EMPTY_DRAFT: RoleDraft = { name: '', description: null, permissions: [] };

interface RoleEditState {
	roles: Role[];
	target: RoleEditTarget;
	/** The role as it stands on the server; null for a new one. */
	original: Role | null;
	draft: RoleDraft;
	/** Whether the draft has been filled from the role being edited. */
	isReady: boolean;
	/** Free text the permission grid is narrowed by. */
	search: string;
	/** The roles the signed-in admin holds, by name, as the server reported. */
	myRoleNames: string[];
	/** How many users the change would reach; null while unknown. */
	holders: number | null;
	isSaving: boolean;
	error: string | null;
}

const initialState: RoleEditState = {
	roles: [],
	target: { uid: null, from: null },
	original: null,
	draft: EMPTY_DRAFT,
	isReady: false,
	search: '',
	myRoleNames: [],
	holders: null,
	isSaving: false,
	error: null,
};

/**
 * Admin: one role being written.
 *
 * It is a page of its own rather than a panel above the list, which is how the
 * shared role library arranges it too — and the reason is the same: a role is
 * a hundred-odd checkboxes, and something that big pushes whatever it sits
 * above off the screen. A page also has an address, so one admin can send
 * another the role they are arguing about.
 *
 * What the page adds to a form is the answer to "and then what?". Saving a
 * role is not saving a setting: the sync hands the difference to everybody
 * holding it, at once. So the editor works out the difference and how many
 * people it reaches, and says both before the button is pressed.
 */
export const RoleEditStore = signalStore(
	withState(initialState),
	withComputed((store, transloco = inject(TranslocoService)) => ({
		/** Everything worth saying about the draft, from the engine. */
		findings: computed(() =>
			validateRole(store.draft(), {
				myRoleNames: store.myRoleNames(),
				roles: store.roles(),
				uid: store.target().uid,
			})
		),

		/** What saving would add and take away. */
		diff: computed(() =>
			permissionDiff(
				store.original()?.permissions ?? [],
				store.draft().permissions
			)
		),

		/** The catalog narrowed by the search box. */
		visibleGroups: computed<PermissionGroup[]>(() =>
			searchCatalog(store.search(), (key) => transloco.translate(key))
		),

		isWildcard: computed(() => hasWildcard(store.draft().permissions)),

		/**
		 * Permissions the role carries that the catalog does not offer — a
		 * script wrote them, or the resource has since been renamed. They are
		 * kept through a save and listed with a way to drop them: a page that
		 * silently discarded them would be the worst kind of editor, and one
		 * that could not drop them would leave a role nobody can tidy.
		 */
		extraPermissions: computed(() =>
			unknownPermissions(store.draft().permissions).filter(
				(permission) => permission !== 'ADMIN'
			)
		),

		/** The document id a new role would be written under. */
		newRoleId: computed(() =>
			store.target().uid ? '' : toRoleId(store.draft().name)
		),
	})),
	withComputed((store) => ({
		/**
		 * Whether the draft may be written. Errors stop it; so does a draft
		 * that would change nothing, because a write that changes nothing
		 * still wakes the sync for every holder of the role.
		 *
		 * Deliberately blind to whether a save is already running: `save`
		 * reads this after setting that flag, and a `canSave` that counted it
		 * would turn every save into a no-op. Not running two at once is the
		 * button's job, and `exhaustMap` sees to the rest.
		 */
		canSave: computed(() => {
			if (hasErrors(store.findings())) {
				return false;
			}

			const original = store.original();
			const draft = store.draft();

			return (
				!original ||
				!isEmptyDiff(store.diff()) ||
				original.name !== draft.name.trim() ||
				(original.description ?? null) !== draft.description
			);
		}),
	})),
	withMethods(
		(
			store,
			effect = inject(RoleEffect),
			roles = inject(NgxRolesService),
			router = inject(Router)
		) => ({
			/**
			 * Opens the editor on a role, or on an empty one. The list is
			 * followed rather than read once: it is what the name is checked
			 * against, and the draft is filled from it the first time it
			 * arrives with something in it.
			 */
			open: rxMethod<RoleEditTarget>(
				pipe(
					tap((target) =>
						patchState(store, {
							...initialState,
							myRoleNames: Object.keys(roles.getRoles()),
							target,
						})
					),
					switchMap((target) =>
						effect.roles$.pipe(
							tap((roles) => {
								patchState(store, { roles });

								// Filled the first time the list arrives with
								// something in it, and once only: it keeps
								// emitting as other admins write, and a second
								// fill would throw away what had been typed.
								if (store.isReady() || !roles.length) return;

								patchState(store, opened(roles, target));
							})
						)
					),
					tapResponse({
						next: () => undefined,
						error: (error: Error) => {
							console.error(error);
							patchState(store, { error: error.message });
						},
					})
				)
			),

			/** How many users the change would reach. */
			countHolders: rxMethod<Role | null>(
				pipe(
					switchMap((role) =>
						role ? effect.countHolders$(role) : of(null)
					),
					tapResponse({
						next: (holders) => patchState(store, { holders }),
						error: (error: Error) => console.error(error),
					})
				)
			),

			setName: (name: string) => patchState(store, patchDraft(store, { name })),
			setDescription: (description: string) =>
				patchState(
					store,
					patchDraft(store, { description: description || null })
				),
			setSearch: (search: string) => patchState(store, { search }),

			/** Grants or takes away a box, a row or a whole group at once. */
			toggle: ({ permissions, granted }: PermissionToggle) => {
				const held = new Set(store.draft().permissions);

				for (const permission of permissions) {
					if (granted) {
						held.add(permission);
					} else {
						held.delete(permission);
					}
				}

				patchState(
					store,
					patchDraft(store, { permissions: [...held].sort() })
				);
			},

			save: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, { isSaving: true, error: null })
					),
					exhaustMap(() => {
						const { uid } = store.target();
						const draft = store.draft();

						// The button is disabled for it; the refusal lives
						// here too, because this is the only place the whole
						// picture is known for certain.
						if (!store.canSave()) {
							return of(null);
						}

						return uid
							? effect.update$(uid, draft)
							: effect.create$(draft);
					}),
					tapResponse({
						next: (saved) => {
							patchState(store, { isSaving: false });

							if (saved) {
								router.navigate(['/admin/role']);
							}
						},
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

			cancel: () => router.navigate(['/admin/role']),
		})
	),
	withHooks({
		// The count follows whichever role the editor settled on, so the page
		// can say how many people a save would reach before it happens.
		onInit: (store) => store.countHolders(store.original),
	})
);

/** The state the editor opens in, once the roles are known. */
function opened(roles: Role[], target: RoleEditTarget): Partial<RoleEditState> {
	const original = target.uid
		? (roles.find((role) => role.uid === target.uid) ?? null)
		: null;
	const source = target.from
		? roles.find((role) => role.uid === target.from)
		: undefined;

	return {
		isReady: true,
		original,
		// A route that names no role is treated as a new one rather than
		// written to. The dashboard's quick action links to `edit/0`, and a
		// save from there must not create a role called `0`.
		target: original ? target : { uid: null, from: target.from },
		draft: original
			? {
					name: original.name,
					description: original.description ?? null,
					permissions: [...(original.permissions ?? [])],
				}
			: {
					// A copy takes the permissions and the description, never
					// the name: two roles answering to one name is the thing
					// the permission sync cannot tell apart.
					name: '',
					description: source?.description ?? null,
					permissions: [...(source?.permissions ?? [])],
				},
	};
}

/** The state patch that changes fields of the role being written. */
function patchDraft(
	store: { draft: () => RoleDraft },
	fields: Partial<RoleDraft>
): Partial<RoleEditState> {
	return { draft: { ...store.draft(), ...fields } };
}
