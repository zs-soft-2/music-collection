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
	FirestoreSyncService,
	LABEL_FEATURE_KEY,
	LabelEntity,
} from '@music-collection/api';

/**
 * Data access for the labels. A label of its own stands in the top-level
 * `label` collection; a sub-label is written under the label it belongs to
 * (`label/{parent}/label/{uid}`), which is why the children are read from
 * there rather than searched for.
 */
@Injectable({ providedIn: 'root' })
export class LabelRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The label, or null when it is not one of its own. */
	public get$(labelUid: string): Observable<LabelEntity | null> {
		return this.firestoreSync
			.list$<LabelEntity>({
				featureKey: LABEL_FEATURE_KEY,
				cacheKey: `${LABEL_FEATURE_KEY}?uid=${labelUid}`,
				query: query(
					collection(this.firestore, LABEL_FEATURE_KEY),
					where(documentId(), '==', labelUid)
				),
				bundle: false,
			})
			.pipe(map((labels) => labels[0] ?? null));
	}

	/** The labels that belong to this one. */
	public listChildren$(labelUid: string): Observable<LabelEntity[]> {
		return this.firestoreSync.list$<LabelEntity>({
			featureKey: LABEL_FEATURE_KEY,
			cacheKey: `${LABEL_FEATURE_KEY}?parentUid=${labelUid}`,
			query: query(
				collection(
					this.firestore,
					LABEL_FEATURE_KEY,
					labelUid,
					LABEL_FEATURE_KEY
				)
			),
			bundle: false,
		});
	}
}
