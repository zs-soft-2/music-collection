import { Observable, from, map, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	collectionGroup,
	getCountFromServer,
	getDocs,
	limit,
	query,
	where,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	EntityUsage,
	EntityUsageHold,
	FirestoreSyncService,
	RELEASE_FEATURE_KEY,
	ReleaseDeletionRepository,
	ReleaseEntity,
	TRACK_FEATURE_KEY,
} from '@music-collection/api';

/** The callable that does the deleting; see `apps/functions/src/index.ts`. */
export const DELETE_RELEASE_ENTITY_FUNCTION = 'deleteReleaseEntity';

@Injectable({ providedIn: 'root' })
export class ReleaseDeletionFirestoreRepository extends ReleaseDeletionRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

	/**
	 * Two counts, both against the server. The copies are the answer that
	 * matters and they are nowhere in this client's cache — they sit under
	 * other collectors' documents — so they are counted rather than looked
	 * for locally. `count()` is one read per thousand index entries, which
	 * is cheaper than the documents and exact enough to show a number.
	 */
	public usage$(release: ReleaseEntity): Observable<EntityUsage> {
		return from(
			Promise.all([
				this.count(
					query(
						collectionGroup(
							this.firestore,
							COLLECTION_ITEM_FEATURE_KEY
						),
						where('release.uid', '==', release.uid)
					)
				),
				this.count(
					query(
						collection(this.firestore, TRACK_FEATURE_KEY),
						where('releaseUid', '==', release.uid)
					)
				),
			])
		).pipe(
			map(([copies, tracks]) => ({
				blocking: hold(COLLECTION_ITEM_FEATURE_KEY, copies),
				cascading: hold(TRACK_FEATURE_KEY, tracks),
			}))
		);
	}

	/**
	 * The client asked first so the page could say what stands in the way;
	 * this asks the server, which asks again inside a transaction. A copy
	 * filed between the two answers is caught there, not here.
	 */
	public delete$(release: ReleaseEntity): Observable<void> {
		const callable = httpsCallable<{ uid: string }, { uid: string }>(
			this.functions,
			DELETE_RELEASE_ENTITY_FUNCTION
		);

		return from(callable({ uid: release.uid })).pipe(map(() => undefined));
	}

	/**
	 * Archiving is an ordinary field write, so it goes straight to Firestore
	 * — the rules already ask for `updateReleaseEntity`, and nothing about
	 * one boolean needs a transaction.
	 */
	public archive$(
		release: ReleaseEntity,
		archived: boolean
	): Observable<void> {
		return this.reference$(release).pipe(
			switchMap((reference) =>
				from(
					this.firestoreSync.set(
						reference,
						RELEASE_FEATURE_KEY,
						{ active: !archived },
						{ merge: true }
					)
				)
			)
		);
	}

	/**
	 * Where the pressing actually lives. Two places hold releases — the root
	 * collection and `artist/{uid}/album/{uid}/release` — and which one a
	 * given release is in depends on what wrote it, so it is looked up by
	 * `uid` across both rather than assembled from a path.
	 */
	private reference$(release: ReleaseEntity) {
		return from(
			getDocs(
				query(
					collectionGroup(this.firestore, RELEASE_FEATURE_KEY),
					where('uid', '==', release.uid),
					limit(1)
				)
			)
		).pipe(
			map((snapshot) => {
				const document = snapshot.docs[0];

				if (!document) {
					throw new Error(`No release document for ${release.uid}`);
				}

				return document.ref;
			})
		);
	}

	/**
	 * How many documents the query matches, or zero when it cannot be asked.
	 * A missing index or a rule is not an answer of "none" — but it must not
	 * pass for one either, and it does not: the server counts again before
	 * it deletes anything.
	 */
	private count(constrained: ReturnType<typeof query>): Promise<number> {
		return getCountFromServer(constrained)
			.then((snapshot) => snapshot.data().count)
			.catch((error) => {
				console.warn('Release usage could not be counted', error);

				return 0;
			});
	}
}

/** One hold, or none at all when nothing was found. */
function hold(featureKey: string, count: number): EntityUsageHold[] {
	return count > 0 ? [{ featureKey, count }] : [];
}
