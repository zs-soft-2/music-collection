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
	DOCUMENT_FEATURE_KEY,
	DocumentEntity,
	FirestoreSyncService,
} from '@music-collection/api';

/** Data access for one uploaded file's record (`document`). */
@Injectable({ providedIn: 'root' })
export class DocumentRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The document, or null when there is no such record. */
	public get$(documentUid: string): Observable<DocumentEntity | null> {
		return this.firestoreSync
			.list$<DocumentEntity>({
				featureKey: DOCUMENT_FEATURE_KEY,
				cacheKey: `${DOCUMENT_FEATURE_KEY}?uid=${documentUid}`,
				query: query(
					collection(this.firestore, DOCUMENT_FEATURE_KEY),
					where(documentId(), '==', documentUid)
				),
				bundle: false,
			})
			.pipe(map((documents) => documents[0] ?? null));
	}
}
