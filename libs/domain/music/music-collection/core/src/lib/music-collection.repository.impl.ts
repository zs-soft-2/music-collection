import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	FirestoreSyncService,
} from '@music-collection/api';
import {
	CREATE_MUSIC_COLLECTION_FUNCTION,
	CatalogCredit,
	CreateMusicCollectionResult,
	DELETE_MUSIC_COLLECTION_FUNCTION,
	MUSIC_COLLECTION_FEATURE_KEY,
	MusicCollectionDraft,
	MusicCollectionEntity,
	MusicCollectionRepository,
	MusicCollectionWriteInput,
	UPDATE_MUSIC_COLLECTION_FUNCTION,
	UpdateMusicCollectionResult,
} from '@music-collection/domain/music-collection/api';

import { toCatalogCredit } from './music-collection.mapper';

/**
 * The definitions in `music-collection/{uid}`, served from the client cache
 * and kept current like the rest of the catalog.
 *
 * Drafts are filtered here rather than in the query: there are few
 * definitions, they are cached whole anyway, and a second filtered query
 * would need its own index and its own cache marker for nothing.
 *
 * Writing is the other way round: the rules refuse every client write here,
 * so it goes to the callables and comes back through the cache.
 */
@Injectable({ providedIn: 'root' })
export class MusicCollectionFirestoreRepository extends MusicCollectionRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

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

	public loadByUid$(
		uid: string
	): Observable<MusicCollectionEntity | undefined> {
		return this.listAll$().pipe(
			map((collections) =>
				collections.find((definition) => definition.uid === uid)
			)
		);
	}

	/** The whole `contribution` collection, served as a bundle like the rest. */
	public listCredits$(): Observable<CatalogCredit[]> {
		return this.firestoreSync
			.list$<ContributionEntity>({
				featureKey: CONTRIBUTION_FEATURE_KEY,
				query: collection(this.firestore, CONTRIBUTION_FEATURE_KEY),
			})
			.pipe(map((contributions) => contributions.map(toCatalogCredit)));
	}

	public create$(
		collection: MusicCollectionDraft
	): Observable<CreateMusicCollectionResult> {
		return this.call$<CreateMusicCollectionResult>(
			CREATE_MUSIC_COLLECTION_FUNCTION,
			{ collection }
		);
	}

	public update$(
		uid: string,
		collection: MusicCollectionDraft
	): Observable<UpdateMusicCollectionResult> {
		return this.call$<UpdateMusicCollectionResult>(
			UPDATE_MUSIC_COLLECTION_FUNCTION,
			{ uid, collection }
		);
	}

	public delete$(uid: string): Observable<void> {
		return this.call$<void>(DELETE_MUSIC_COLLECTION_FUNCTION, { uid });
	}

	private call$<T>(
		name: string,
		input: Partial<MusicCollectionWriteInput>
	): Observable<T> {
		const callable = httpsCallable<Partial<MusicCollectionWriteInput>, T>(
			this.functions,
			name
		);

		return from(callable(input)).pipe(map((result) => result.data));
	}
}
