import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';
import {
	MUSIC_COLLECTION_FEATURE_KEY,
	MusicCollectionEntity,
	MusicCollectionRepository,
} from '@music-collection/domain/music-collection/api';

/**
 * The definitions in `music-collection/{uid}`, served from the client cache
 * and kept current like the rest of the catalog.
 *
 * Drafts are filtered here rather than in the query: there are few
 * definitions, they are cached whole anyway, and a second filtered query
 * would need its own index and its own cache marker for nothing.
 */
@Injectable({ providedIn: 'root' })
export class MusicCollectionFirestoreRepository extends MusicCollectionRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	public listAll$(): Observable<MusicCollectionEntity[]> {
		return this.firestoreSync.list$<MusicCollectionEntity>({
			featureKey: MUSIC_COLLECTION_FEATURE_KEY,
			query: query(
				collection(this.firestore, MUSIC_COLLECTION_FEATURE_KEY)
			),
			incremental: true,
		});
	}

	public listPublished$(): Observable<MusicCollectionEntity[]> {
		return this.listAll$().pipe(
			map((collections) =>
				collections.filter(
					(definition) => definition.status === 'published'
				)
			)
		);
	}

	public loadBySlug$(
		slug: string
	): Observable<MusicCollectionEntity | undefined> {
		return this.listAll$().pipe(
			map((collections) =>
				collections.find((definition) => definition.slug === slug)
			)
		);
	}
}
