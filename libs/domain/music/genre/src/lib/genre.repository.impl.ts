import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	doc,
	getDocs,
	limit,
	query,
	where,
} from '@angular/fire/firestore';
import {
	ARTIST_FEATURE_KEY,
	EntityTypeEnum,
	FirestoreSyncService,
	GENRE_FEATURE_KEY,
	GenreDraft,
	GenreEntity,
	GenreRepository,
	toGenreSlug,
} from '@music-collection/api';

/**
 * The taxonomy in `genre/{uid}`, served from the client cache like the rest of
 * the catalog: a dozen documents that every form reads and an admin rarely
 * changes, which is exactly what the sync stamp is for — one download, then
 * nothing until somebody edits a genre.
 *
 * No bundle: the whole collection is smaller than the marker bookkeeping
 * around it, so the documents are read directly.
 */
@Injectable({ providedIn: 'root' })
export class GenreFirestoreRepository extends GenreRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	public list$(): Observable<GenreEntity[]> {
		return this.firestoreSync.list$<GenreEntity>({
			featureKey: GENRE_FEATURE_KEY,
			query: query(collection(this.firestore, GENRE_FEATURE_KEY)),
			incremental: true,
		});
	}

	/**
	 * A genre's slug is its document id: it is what a stored genre is pointed
	 * at by, and it must not move when the name is corrected. That also makes
	 * the seeding script and this write the same write.
	 */
	public create$(genre: GenreDraft): Observable<GenreEntity> {
		const entity = this.toEntity(toGenreSlug(genre.name), genre);

		return from(
			this.firestoreSync.set(
				doc(this.firestore, GENRE_FEATURE_KEY, entity.uid),
				GENRE_FEATURE_KEY,
				entity
			)
		).pipe(map(() => entity));
	}

	public update$(uid: string, genre: GenreDraft): Observable<GenreEntity> {
		const entity = this.toEntity(uid, genre);

		return from(
			this.firestoreSync.set(
				doc(this.firestore, GENRE_FEATURE_KEY, uid),
				GENRE_FEATURE_KEY,
				entity,
				{ merge: true }
			)
		).pipe(map(() => entity));
	}

	public delete$(genre: GenreEntity): Observable<void> {
		return from(
			this.firestoreSync.delete(
				doc(this.firestore, GENRE_FEATURE_KEY, genre.uid),
				GENRE_FEATURE_KEY
			)
		);
	}

	/**
	 * Whether the catalog still names the genre. Asked of the server rather
	 * than of the cached artists: one read against a list of hundreds, and the
	 * answer has to be current — it is what a delete turns on.
	 */
	public isInUse$(name: string): Observable<boolean> {
		return from(
			getDocs(
				query(
					collection(this.firestore, ARTIST_FEATURE_KEY),
					where('genre', '==', name),
					limit(1)
				)
			)
		).pipe(map((snapshot) => !snapshot.empty));
	}

	/**
	 * The document a draft writes. The slug is the id rather than a second
	 * field to keep in step: renaming a genre leaves what points at it alone.
	 */
	private toEntity(uid: string, genre: GenreDraft): GenreEntity {
		return {
			active: genre.active,
			description: genre.description,
			entityType: EntityTypeEnum.Genre,
			name: genre.name.trim(),
			slug: uid,
			styles: genre.styles,
			uid,
		};
	}
}
