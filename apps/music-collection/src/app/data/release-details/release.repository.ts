import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	QueryConstraint,
	collectionGroup,
	query,
	where,
} from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	RELEASE_FEATURE_KEY,
	ReleaseEntity,
} from '@music-collection/api';

/**
 * Data access for the pressings.
 *
 * A pressing is filed under the work it is an edition of
 * (`artist/{artist}/album/{album}/release/{uid}`), so it cannot be read as a
 * document from its id alone: nothing in the id says which album it belongs
 * to. Every query here goes over the collection group instead, which is why
 * `release.uid`, `release.album.uid` and `release.label.uid` are declared
 * with collection-group scope in `firestore.indexes.json`.
 *
 * None of these loads the feature's bundle: they name a few documents, and a
 * bundle holds the feature whole.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The pressing, or null when there is no such document. */
	public get$(releaseUid: string): Observable<ReleaseEntity | null> {
		return this.list$(
			`uid=${releaseUid}`,
			where('uid', '==', releaseUid)
		).pipe(map((releases) => releases[0] ?? null));
	}

	/** Every pressing of one album — the other editions of the same work. */
	public listByAlbum$(albumUid: string): Observable<ReleaseEntity[]> {
		return this.list$(
			`albumUid=${albumUid}`,
			where('album.uid', '==', albumUid)
		);
	}

	/** Everything a label put out. */
	public listByLabel$(labelUid: string): Observable<ReleaseEntity[]> {
		return this.list$(
			`labelUid=${labelUid}`,
			where('label.uid', '==', labelUid)
		);
	}

	private list$(
		cacheKey: string,
		...constraints: QueryConstraint[]
	): Observable<ReleaseEntity[]> {
		return this.firestoreSync.list$<ReleaseEntity>({
			featureKey: RELEASE_FEATURE_KEY,
			cacheKey: `${RELEASE_FEATURE_KEY}?${cacheKey}`,
			query: query(
				collectionGroup(this.firestore, RELEASE_FEATURE_KEY),
				...constraints
			),
			bundle: false,
		});
	}
}
