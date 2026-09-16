import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	documentId,
	query,
	where,
} from '@angular/fire/firestore';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	FirestoreSyncService,
	MUSICIAN_FEATURE_KEY,
	MusicianEntity,
} from '@music-collection/api';

/** Data access for a `musician` document and the credits of the musician. */
@Injectable({ providedIn: 'root' })
export class MusicianRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The musician, or null when there is no such document. */
	public get$(musicianUid: string): Observable<MusicianEntity | null> {
		return this.firestoreSync
			.list$<MusicianEntity>({
				featureKey: MUSICIAN_FEATURE_KEY,
				cacheKey: `${MUSICIAN_FEATURE_KEY}?uid=${musicianUid}`,
				query: query(
					collection(this.firestore, MUSICIAN_FEATURE_KEY),
					where(documentId(), '==', musicianUid)
				),
			})
			.pipe(map((musicians) => musicians[0] ?? null));
	}

	/** Every album credit of the musician. */
	public listContributions$(
		musicianUid: string
	): Observable<ContributionEntity[]> {
		return this.firestoreSync.list$<ContributionEntity>({
			featureKey: CONTRIBUTION_FEATURE_KEY,
			cacheKey: `${CONTRIBUTION_FEATURE_KEY}?musicianUid=${musicianUid}`,
			query: query(
				collection(this.firestore, CONTRIBUTION_FEATURE_KEY),
				where('musicianUid', '==', musicianUid)
			),
		});
	}
}
