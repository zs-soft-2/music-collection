import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	doc,
	getCountFromServer,
	query,
	where,
} from '@angular/fire/firestore';
import { FirestoreSyncService, Role, RoleDraft } from '@music-collection/api';

/** The roles live in `role/{roleId}`; the sync stamp goes by the same name. */
export const ROLE_FEATURE_KEY = 'role';

/** Where a user's role references are kept. */
const USER_FEATURE_KEY = 'user';

/**
 * Data access for the roles.
 *
 * A handful of documents that every signed-in client may read and only an
 * admin writes, so they go through the sync service like the catalog does:
 * one download, then nothing until somebody edits a role. No bundle — the
 * bookkeeping around one would outweigh the documents.
 *
 * The document id is not generated: the seeding scripts write `role/USER` and
 * the permission sync matches a user's reference against the id *or* the name,
 * so an id that reads like the name keeps the two worlds together.
 */
@Injectable({ providedIn: 'root' })
export class RoleRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	public list$(): Observable<Role[]> {
		return this.firestoreSync.list$<Role>({
			featureKey: ROLE_FEATURE_KEY,
			query: query(collection(this.firestore, ROLE_FEATURE_KEY)),
			bundle: false,
		});
	}

	public create$(uid: string, role: RoleDraft): Observable<Role> {
		const entity = this.toEntity(uid, role);

		return from(
			this.firestoreSync.set(
				doc(this.firestore, ROLE_FEATURE_KEY, uid),
				ROLE_FEATURE_KEY,
				entity
			)
		).pipe(map(() => entity));
	}

	/**
	 * Merged rather than overwritten: a role written by a script may carry
	 * fields this page never shows, and a save is not the place to lose them.
	 */
	public update$(uid: string, role: RoleDraft): Observable<Role> {
		const entity = this.toEntity(uid, role);

		return from(
			this.firestoreSync.set(
				doc(this.firestore, ROLE_FEATURE_KEY, uid),
				ROLE_FEATURE_KEY,
				entity,
				{ merge: true }
			)
		).pipe(map(() => entity));
	}

	public delete$(uid: string): Observable<void> {
		return from(
			this.firestoreSync.delete(
				doc(this.firestore, ROLE_FEATURE_KEY, uid),
				ROLE_FEATURE_KEY
			)
		);
	}

	/**
	 * How many users hold the role. Both the id and the name count as a
	 * reference, because that is what the permission sync matches on
	 * (`apps/functions` — roleReferences): a role deleted while a user still
	 * names it would leave that user pointing at nothing.
	 *
	 * Asked of the server, and counted rather than read: the answer decides
	 * whether a delete may go through, so it has to be current, and the page
	 * has no business downloading every user to find out.
	 */
	public countHolders$(role: Role): Observable<number> {
		const references = [...new Set([role.uid, role.name].filter(Boolean))];

		return from(
			getCountFromServer(
				query(
					collection(this.firestore, USER_FEATURE_KEY),
					where('roleIds', 'array-contains-any', references)
				)
			)
		).pipe(map((snapshot) => snapshot.data().count));
	}

	/** The document a draft writes. */
	private toEntity(uid: string, role: RoleDraft): Role {
		return {
			description: role.description ?? null,
			name: role.name.trim(),
			permissions: [...role.permissions].sort(),
			uid,
		};
	}
}
