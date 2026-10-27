import { Observable, map, shareReplay, startWith } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { EffectivePermissions, User } from '@music-collection/api';

import { userName } from './user-role.adapter';
import { ResyncResult, UserRoleRepository } from './user-role.repository';

/**
 * Who holds which role, and the writes an admin makes to that.
 *
 * Nothing here writes a permission. The `roleIds` of a user document is the
 * only thing that changes; the trigger on it recomputes
 * `security/users/{uid}/effective_permissions`, and that is what every rule
 * and the client read. So a role taken away here is taken away everywhere,
 * a moment later — and a page that showed the permissions from the role
 * documents instead would be telling a story the server has not agreed to.
 */
@Injectable({ providedIn: 'root' })
export class UserRoleEffect {
	private readonly repository = inject(UserRoleRepository);

	/**
	 * Every user, by name. Starts empty rather than pending: a list that never
	 * answered would otherwise leave the page saying "loading" for good.
	 */
	public readonly users$: Observable<User[]> = this.repository.list$().pipe(
		map((users) => [...users].sort(byName)),
		startWith([] as User[]),
		shareReplay({ bufferSize: 1, refCount: false })
	);

	public assign$(uid: string, roleIds: string[]): Observable<void> {
		return this.repository.assign$(uid, [...new Set(roleIds)].sort());
	}

	public effectivePermissions$(
		uid: string
	): Observable<EffectivePermissions | null> {
		return this.repository.effectivePermissions$(uid);
	}

	public resync$(): Observable<ResyncResult> {
		return this.repository.resync$();
	}
}

const byName = (left: User, right: User): number =>
	userName(left).toLocaleLowerCase().localeCompare(
		userName(right).toLocaleLowerCase()
	);
