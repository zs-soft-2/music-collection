import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where } from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	MEMBERSHIP_FEATURE_KEY,
	MembershipEntity,
} from '@music-collection/api';

/** Data access for `membership` documents (musician ↔ band, from–to years). */
@Injectable({ providedIn: 'root' })
export class MembershipRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The line-up of a band. */
	public listByArtist$(artistUid: string): Observable<MembershipEntity[]> {
		return this.listBy$('artistUid', artistUid);
	}

	/** The bands a musician played in. */
	public listByMusician$(
		musicianUid: string
	): Observable<MembershipEntity[]> {
		return this.listBy$('musicianUid', musicianUid);
	}

	/** Served from the local cache while the collection is unchanged. */
	private listBy$(
		field: 'artistUid' | 'musicianUid',
		value: string
	): Observable<MembershipEntity[]> {
		return this.firestoreSync.list$<MembershipEntity>({
			featureKey: MEMBERSHIP_FEATURE_KEY,
			cacheKey: `${MEMBERSHIP_FEATURE_KEY}?${field}=${value}`,
			query: query(
				collection(this.firestore, MEMBERSHIP_FEATURE_KEY),
				where(field, '==', value)
			),
		});
	}
}
