import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	doc,
	query,
	where,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	DECIDE_REQUEST_FUNCTION,
	DecideRequestInput,
	DecideRequestResult,
	ENTITY_REQUEST_FEATURE_KEY,
	ENTITY_RESPONSE_FEATURE_KEY,
	EntityRequest,
	EntityRequestAdd,
	EntityResponse,
	FirestoreSyncService,
	User,
} from '@music-collection/api';

const USER_COLLECTION = 'user';

/**
 * Data access for what a collector asks the catalog to take in
 * (`entity-request/{uid}`).
 *
 * A collector reads their own requests and nobody else's, and an admin reads
 * them all; the decision itself is written by the server, through the
 * `decideRequest` callable. No bundle is published for the feature — a
 * collector has a handful of these, where a bundle holds a whole collection —
 * so the queries read the documents they name.
 */
@Injectable({ providedIn: 'root' })
export class RequestRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

	public listByUser$(userId: string): Observable<EntityRequest[]> {
		return this.firestoreSync.list$<EntityRequest>({
			featureKey: ENTITY_REQUEST_FEATURE_KEY,
			// Whose requests they are belongs in the key: two accounts share
			// one browser, and the second must not read the first one's cache.
			cacheKey: `${ENTITY_REQUEST_FEATURE_KEY}?userId=${userId}`,
			query: query(
				collection(this.firestore, ENTITY_REQUEST_FEATURE_KEY),
				where('userId', '==', userId)
			),
			bundle: false,
		});
	}

	/** Every request; only an admin may read them all. */
	public listAll$(): Observable<EntityRequest[]> {
		return this.firestoreSync.list$<EntityRequest>({
			featureKey: ENTITY_REQUEST_FEATURE_KEY,
			query: collection(this.firestore, ENTITY_REQUEST_FEATURE_KEY),
			bundle: false,
		});
	}

	/** The answers written to one collector; the rules let them read no others. */
	public listResponsesByUser$(userId: string): Observable<EntityResponse[]> {
		return this.firestoreSync.list$<EntityResponse>({
			featureKey: ENTITY_RESPONSE_FEATURE_KEY,
			cacheKey: `${ENTITY_RESPONSE_FEATURE_KEY}?userId=${userId}`,
			query: query(
				collection(this.firestore, ENTITY_RESPONSE_FEATURE_KEY),
				where('userId', '==', userId)
			),
			bundle: false,
		});
	}

	/** Every answer; an admin reads them all, to see what was decided. */
	public listAllResponses$(): Observable<EntityResponse[]> {
		return this.firestoreSync.list$<EntityResponse>({
			featureKey: ENTITY_RESPONSE_FEATURE_KEY,
			query: collection(this.firestore, ENTITY_RESPONSE_FEATURE_KEY),
			bundle: false,
		});
	}

	/** The users, to name the collectors who asked (admin). */
	public listUsers$(): Observable<User[]> {
		return this.firestoreSync.list$<User>({
			featureKey: USER_COLLECTION,
			query: collection(this.firestore, USER_COLLECTION),
		});
	}

	/**
	 * The decision, field by field. It writes the catalog and the answer on
	 * the server: a collector may not write the one, and nobody may write the
	 * other.
	 */
	public decide$(input: DecideRequestInput): Observable<DecideRequestResult> {
		const callable = httpsCallable<DecideRequestInput, DecideRequestResult>(
			this.functions,
			DECIDE_REQUEST_FUNCTION
		);

		return from(callable(input)).pipe(map((result) => result.data));
	}

	public add$(request: EntityRequestAdd): Observable<EntityRequest> {
		const reference = doc(
			collection(this.firestore, ENTITY_REQUEST_FEATURE_KEY)
		);
		const created: EntityRequest = { ...request, uid: reference.id };

		return from(
			this.firestoreSync.set(
				reference,
				ENTITY_REQUEST_FEATURE_KEY,
				created
			)
		).pipe(map(() => created));
	}
}
