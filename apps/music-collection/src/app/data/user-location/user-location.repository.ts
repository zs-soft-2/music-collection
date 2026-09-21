import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, query } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import { PublicUserLocation } from './user-location.model';

export const USER_LOCATION_FEATURE_KEY = 'user-location';

/**
 * Data access for the locations collectors chose to share. Its own
 * collection, not a field of the user: a document is here only while its
 * owner shares something, so the rules can let everyone signed in read it
 * without opening up the user documents.
 */
@Injectable({ providedIn: 'root' })
export class UserLocationRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/**
	 * Every location shared right now. Readable only when signed in, so the
	 * map asks for it after the sign-in state is known.
	 */
	public list$(): Observable<PublicUserLocation[]> {
		return this.firestoreSync.list$<PublicUserLocation>({
			featureKey: USER_LOCATION_FEATURE_KEY,
			cacheKey: USER_LOCATION_FEATURE_KEY,
			query: query(collection(this.firestore, USER_LOCATION_FEATURE_KEY)),
		});
	}

	/** Overwrites the document, so a lowered level drops the fields it no
	 * longer allows instead of leaving them behind. */
	public save(location: PublicUserLocation): Promise<void> {
		return this.firestoreSync.set(
			this.reference(location.uid),
			USER_LOCATION_FEATURE_KEY,
			location
		);
	}

	public remove(uid: string): Promise<void> {
		return this.firestoreSync.delete(
			this.reference(uid),
			USER_LOCATION_FEATURE_KEY
		);
	}

	private reference(uid: string) {
		return doc(this.firestore, USER_LOCATION_FEATURE_KEY, uid);
	}
}
