import { Observable, catchError, from, map, of } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	deleteField,
	doc,
	docData,
	query,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	EffectivePermissions,
	FirestoreSyncService,
	User,
} from '@music-collection/api';

/** The users live in `user/{uid}`; the sync stamp goes by the same name. */
const USER_FEATURE_KEY = 'user';

/** Where the permission sync leaves its answer for one user. */
const effectivePermissionsPath = (uid: string) =>
	`security/users/${uid}/effective_permissions`;

/**
 * Recomputes every user's effective permissions (`apps/functions`). The
 * triggers keep them current on their own; this is for after a script wrote
 * the database behind their back.
 */
const RESYNC_CALLABLE = 'resyncEffectivePermissions';

export interface ResyncResult {
	users: number;
	changed: number;
}

/**
 * Data access for who holds which role.
 *
 * Reading the list needs `viewUserEntity` and writing `roleIds` needs
 * `updateUserEntity` — the rules let a user write their own document but not
 * those two fields, which is the whole point: a collector cannot promote
 * themselves.
 *
 * No bundle: the users are not catalog, and an admin page is the only thing
 * that ever asks for all of them.
 */
@Injectable({ providedIn: 'root' })
export class UserRoleRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

	public list$(): Observable<User[]> {
		return this.firestoreSync.list$<User>({
			featureKey: USER_FEATURE_KEY,
			query: query(collection(this.firestore, USER_FEATURE_KEY)),
			bundle: false,
		});
	}

	/**
	 * Hands the user exactly these roles.
	 *
	 * The legacy embedded `roles` field goes with the write. The permission
	 * sync reads the names out of it as references too, so leaving it behind
	 * would mean taking a role away here and watching the user keep it — the
	 * one failure this page must not have.
	 */
	public assign$(uid: string, roleIds: string[]): Observable<void> {
		return from(
			this.firestoreSync.update(
				doc(this.firestore, USER_FEATURE_KEY, uid),
				USER_FEATURE_KEY,
				{ roleIds, roles: deleteField() }
			)
		);
	}

	/**
	 * What the permission sync worked out for one user. Read one at a time,
	 * when the page is asked to show it: the document is not listable (the
	 * rules allow `get` only), and an admin rarely needs more than one.
	 */
	public effectivePermissions$(
		uid: string
	): Observable<EffectivePermissions | null> {
		return (
			docData(
				doc(this.firestore, effectivePermissionsPath(uid))
			) as Observable<EffectivePermissions | undefined>
		).pipe(
			map((effective) => effective ?? null),
			// A user the sync has not reached yet simply has no document; so
			// has one whose permissions this admin may not read.
			catchError(() => of(null))
		);
	}

	public resync$(): Observable<ResyncResult> {
		const callable = httpsCallable<void, ResyncResult>(
			this.functions,
			RESYNC_CALLABLE
		);

		return from(callable()).pipe(map((result) => result.data));
	}
}
