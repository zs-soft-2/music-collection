import {
	Observable,
	catchError,
	map,
	of,
	shareReplay,
	startWith,
	switchMap,
	take,
	throwError,
	timeout,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Role, RoleDraft } from '@music-collection/api';

import { nameCollision, toRoleId } from './role.engine';
import { RoleRepository } from './role.repository';

/** How long a write waits for the role list before going ahead without it. */
const UNREADABLE_AFTER_MS = 5_000;

/** A name the write path found taken; the page has a sentence for each. */
export const ROLE_NAME_TAKEN = 'name-taken';
export const ROLE_ID_TAKEN = 'id-taken';

/** A role somebody still holds; the page has a sentence of its own for it. */
export const ROLE_IN_USE = 'role-in-use';

/**
 * Who holds a role could not be established. Deleting needs the answer, and
 * the answer is a query over the users — which is itself a permission
 * (`viewUserEntity`). A role admin without it can edit roles but cannot be
 * told whether one is safe to delete, and guessing is not an option here.
 */
export const HOLDERS_UNREADABLE = 'holders-unreadable';

/**
 * A role somebody still holds. Thrown rather than returned, because the caller
 * has to stop: the users would be left pointing at a role that is not there,
 * and the permission sync would quietly drop every permission it carried.
 */
export class RoleInUseError extends Error {
	public constructor(public readonly holders: number) {
		super(`Role held by ${holders} user(s)`);
		this.name = 'RoleInUseError';
	}
}

/**
 * The roles as the admin pages ask for them, and the writes an admin makes.
 *
 * A role is only a name and a list of permissions; what makes it matter is the
 * server side sync, which gathers the permissions of every role a user holds
 * into `security/users/{uid}/effective_permissions`. Nothing here writes that
 * document — the trigger on `role/{roleId}` does, for every user, as soon as
 * one of these writes lands.
 *
 * The rules of what may be written live in `role.engine.ts`; this layer is the
 * orchestration around them and the data access underneath.
 */
@Injectable({ providedIn: 'root' })
export class RoleEffect {
	private readonly repository = inject(RoleRepository);

	/**
	 * The roles as they were last read, by name. Nothing stands in for an
	 * answer that has not come yet, which is what makes it the list a write
	 * may be checked against — see `roles$` for the one a page draws.
	 */
	private readonly loaded$: Observable<Role[]> = this.repository
		.list$()
		.pipe(
			map((roles) =>
				[...roles].sort((left, right) =>
					left.name.localeCompare(right.name)
				)
			),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	/**
	 * Every role by name, the empty list until the first answer arrives: three
	 * pages read it, and a page that waited for it would stay blank for good
	 * if a rule were missing — the sync never errors, it simply never emits.
	 */
	public readonly roles$: Observable<Role[]> = this.loaded$.pipe(
		startWith([] as Role[]),
		shareReplay({ bufferSize: 1, refCount: false })
	);

	/** One role by its document id, null once the list says there is none. */
	public role$(uid: string): Observable<Role | null> {
		return this.roles$.pipe(
			map((roles) => roles.find((role) => role.uid === uid) ?? null)
		);
	}

	public create$(draft: RoleDraft): Observable<Role> {
		const uid = toRoleId(draft.name);

		return this.roster$().pipe(
			switchMap((roles) => {
				const collision = nameCollision(draft.name, {
					roles,
					uid: null,
				});

				return collision
					? throwError(() => new Error(collision))
					: this.repository.create$(uid, draft);
			})
		);
	}

	public update$(uid: string, draft: RoleDraft): Observable<Role> {
		return this.roster$().pipe(
			switchMap((roles) => {
				const collision = nameCollision(draft.name, { roles, uid });

				return collision
					? throwError(() => new Error(collision))
					: this.repository.update$(uid, draft);
			})
		);
	}

	/**
	 * Deleting a role is refused while a user holds it. There is no archiving
	 * here as there is for a genre: a role nobody should be given any more is
	 * emptied of its permissions, which takes everything away without leaving
	 * a user pointing at a document that is gone.
	 */
	public delete$(role: Role): Observable<void> {
		return this.countHolders$(role).pipe(
			switchMap((holders) =>
				holders === null
					? throwError(() => new Error(HOLDERS_UNREADABLE))
					: holders
						? throwError(() => new RoleInUseError(holders))
						: this.repository.delete$(role.uid)
			)
		);
	}

	/**
	 * How many users hold the role; null when the question could not be put to
	 * the server. Null rather than zero on purpose — "nobody holds it" and "I
	 * was not allowed to ask" lead to opposite decisions.
	 */
	public countHolders$(role: Role): Observable<number | null> {
		return this.repository.countHolders$(role).pipe(
			catchError((error) => {
				console.warn('Role holders unreadable', error);

				return of(null);
			})
		);
	}

	/**
	 * The list a write is checked against. Bounded on purpose: the sync does
	 * not error, it simply never emits, so a list that cannot be read would
	 * otherwise leave the save spinning for good. A name check that did not
	 * run is the lesser harm — nothing on the server depends on it, and the
	 * page would be showing an empty list of roles anyway.
	 */
	private roster$(): Observable<Role[]> {
		return this.loaded$.pipe(
			take(1),
			timeout({ first: UNREADABLE_AFTER_MS, with: () => of<Role[]>([]) })
		);
	}
}
