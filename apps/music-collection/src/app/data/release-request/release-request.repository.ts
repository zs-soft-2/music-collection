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
	DISCOGS_MASTER_VERSIONS_FUNCTION,
	DiscogsMasterVersionsRequest,
	DiscogsMasterVersionsResponse,
	DiscogsVersion,
	FirestoreSyncService,
	RELEASE_REQUEST_FEATURE_KEY,
	ReleaseRequest,
	ReleaseRequestAdd,
} from '@music-collection/api';

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
