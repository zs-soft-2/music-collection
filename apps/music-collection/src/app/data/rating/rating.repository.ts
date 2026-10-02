import { Observable, catchError, map, of, switchMap } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import { Firestore, collection, doc, docData } from '@angular/fire/firestore';
import {
	AuthenticatedUserService,
	FirestoreSyncService,
} from '@music-collection/api';

import {
	ALBUM_RATING_COLLECTION,
	AlbumRatingSummary,
} from './community-rating.model';
import { AlbumRating, RATING_FEATURE_KEY } from './rating.model';

/** Parent of the users' own data (`user/{uid}/rating`). */
const USER_COLLECTION = 'user';

/**
 * Data access for what a collector thinks of their records.
 *
 * Two different kinds of document, on purpose. The stars themselves are
 * private and live under the user, read and written by nobody else — the
 * rules stop at `isSelf`, and there is no collection-group rule over
 * `rating`, so no query of any depth can gather up what people think. The
 * sum of everybody's stars is a catalog-level document the server alone
 * writes, and the page reads one of those when it opens an album.
 */
@Injectable({ providedIn: 'root' })
export class RatingRepository {
	private readonly firestore = inject(Firestore);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly injector = inject(Injector);

	/** Every rating of the signed-in collector; empty while signed out. */
	public list$(): Observable<AlbumRating[]> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user
					? this.firestoreSync.list$<AlbumRating>({
							featureKey: RATING_FEATURE_KEY,
							cacheKey: `${RATING_FEATURE_KEY}?userId=${user.uid}`,
							query: runInInjectionContext(this.injector, () =>
								collection(
									this.firestore,
									USER_COLLECTION,
									user.uid,
									RATING_FEATURE_KEY
								)
							),
							incremental: true,
							// Private data: there is no bundle to fill from.
							bundle: false,
						})
					: of([])
			)
		);
	}

	/**
	 * Writes one record's rating. The album's id is the document's, so a
	 * collector who changes their mind rewrites their verdict rather than
	 * casting a second vote.
	 */
	public save(rating: AlbumRating): Promise<void> {
		const reference = this.reference(rating.albumId);

		return reference
			? this.firestoreSync.set(reference, RATING_FEATURE_KEY, {
					...rating,
				})
			: Promise.resolve();
	}

	/** Takes the rating back, leaving the record unjudged rather than poor. */
	public remove(albumId: string): Promise<void> {
		const reference = this.reference(albumId);

		return reference
			? this.firestoreSync.delete(reference, RATING_FEATURE_KEY)
			: Promise.resolve();
	}

	/**
	 * Everybody's stars for one record, or null while nobody has given any.
	 * A summary that cannot be read is the same answer: the page says
	 * nothing about the crowd rather than showing an error over a record.
	 */
	public summary$(albumId: string): Observable<AlbumRatingSummary | null> {
		return runInInjectionContext(
			this.injector,
			() =>
				docData(
					doc(this.firestore, ALBUM_RATING_COLLECTION, albumId)
				) as Observable<AlbumRatingSummary | undefined>
		).pipe(
			map((summary) => summary ?? null),
			catchError((error) => {
				console.warn('Album rating summary unavailable', error);

				return of(null);
			})
		);
	}

	/** Whether a rating would be kept at all. */
	public get signedIn(): boolean {
		return !!this.authenticatedUser.current;
	}

	private reference(albumId: string) {
		const user = this.authenticatedUser.current;

		return user
			? runInInjectionContext(this.injector, () =>
					doc(
						this.firestore,
						USER_COLLECTION,
						user.uid,
						RATING_FEATURE_KEY,
						albumId
					)
				)
			: null;
	}
}
