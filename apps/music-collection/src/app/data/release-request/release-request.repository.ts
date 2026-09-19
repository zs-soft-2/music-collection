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
	APPROVE_RELEASE_REQUEST_FUNCTION,
	ApproveReleaseRequestInput,
	ApproveReleaseRequestResult,
	DISCOGS_MASTER_VERSIONS_FUNCTION,
	DiscogsMasterVersionsRequest,
	DiscogsMasterVersionsResponse,
	DiscogsVersion,
	FirestoreSyncService,
	RELEASE_REQUEST_FEATURE_KEY,
	ReleaseRequest,
	ReleaseRequestAdd,
	User,
} from '@music-collection/api';

const USER_COLLECTION = 'user';

/**
 * Data access for release requests (`release-request/{uid}`) and the Discogs
 * pressings of a master (`discogsMasterVersions` callable).
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRequestRepository {
	private readonly firestore = inject(Firestore);
	private readonly functions = inject(Functions);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The user's own requests; the rules let them read no others. */
	public listByUser$(userId: string): Observable<ReleaseRequest[]> {
		return this.firestoreSync.list$<ReleaseRequest>({
			featureKey: RELEASE_REQUEST_FEATURE_KEY,
			cacheKey: `${RELEASE_REQUEST_FEATURE_KEY}?userId=${userId}`,
			query: query(
				collection(this.firestore, RELEASE_REQUEST_FEATURE_KEY),
				where('userId', '==', userId)
			),
		});
	}

	/** Every request; only an admin may read them all. */
	public listAll$(): Observable<ReleaseRequest[]> {
		return this.firestoreSync.list$<ReleaseRequest>({
			featureKey: RELEASE_REQUEST_FEATURE_KEY,
			query: collection(this.firestore, RELEASE_REQUEST_FEATURE_KEY),
		});
	}

	/** The users, to name the requesters (admin). */
	public listUsers$(): Observable<User[]> {
		return this.firestoreSync.list$<User>({
			featureKey: USER_COLLECTION,
			query: collection(this.firestore, USER_COLLECTION),
		});
	}

	/** Imports or links the release and adds the copy on the server. */
	public approve$(
		input: ApproveReleaseRequestInput
	): Observable<ApproveReleaseRequestResult> {
		const callable = httpsCallable<
			ApproveReleaseRequestInput,
			ApproveReleaseRequestResult
		>(this.functions, APPROVE_RELEASE_REQUEST_FUNCTION);

		return from(callable(input)).pipe(map((result) => result.data));
	}

	public reject$(
		requestId: string,
		adminNote: string | null,
		adminUid: string
	): Observable<void> {
		return from(
			this.firestoreSync.update(
				doc(this.firestore, RELEASE_REQUEST_FEATURE_KEY, requestId),
				RELEASE_REQUEST_FEATURE_KEY,
				{
					status: 'rejected',
					adminNote,
					decidedAt: Date.now(),
					decidedBy: adminUid,
				}
			)
		);
	}

	public add$(request: ReleaseRequestAdd): Observable<ReleaseRequest> {
		const reference = doc(
			collection(this.firestore, RELEASE_REQUEST_FEATURE_KEY)
		);
		const created: ReleaseRequest = { ...request, uid: reference.id };

		return from(
			this.firestoreSync.set(
				reference,
				RELEASE_REQUEST_FEATURE_KEY,
				created
			)
		).pipe(map(() => created));
	}

	public listDiscogsVersions$(
		masterId: number
	): Observable<DiscogsVersion[]> {
		const callable = httpsCallable<
			DiscogsMasterVersionsRequest,
			DiscogsMasterVersionsResponse
		>(this.functions, DISCOGS_MASTER_VERSIONS_FUNCTION);

		return from(callable({ masterId })).pipe(
			map((result) => result.data.versions)
		);
	}
}
