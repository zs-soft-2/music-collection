import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query } from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	UPCOMING_RELEASE_FEATURE_KEY,
	UpcomingReleaseEntity,
} from '@music-collection/api';

/**
 * Data access for the records that have not come out yet. The collection is
 * written only by `refreshUpcomingReleases` (Cloud Functions) and holds one
 * document per album in the window — a few dozen — so it is read whole,
 * through the catalog cache like the rest of the catalog.
 */
@Injectable({ providedIn: 'root' })
export class UpcomingReleaseRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	public list$(): Observable<UpcomingReleaseEntity[]> {
		return this.firestoreSync.list$<UpcomingReleaseEntity>({
			featureKey: UPCOMING_RELEASE_FEATURE_KEY,
			query: query(
				collection(this.firestore, UPCOMING_RELEASE_FEATURE_KEY)
			),
		});
	}
}
