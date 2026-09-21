import { Observable, catchError, defer, of } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import {
	Firestore,
	collection,
	getCountFromServer,
	query,
} from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	TRACK_FEATURE_KEY,
	TRACK_LYRICS_FEATURE_KEY,
	TrackEntity,
} from '@music-collection/api';

/** Data access for the track data of the whole catalog. */
@Injectable({ providedIn: 'root' })
export class TrackStatsRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly injector = inject(Injector);

	/**
	 * Every track, through the catalog cache: which albums have a tracklist
	 * cannot be counted by Firestore, so the documents themselves are needed.
	 * Once the collection is published as a bundle
	 * (`tools/sync/build-bundles.mjs`) a cold cache costs a download instead
	 * of a read per track; afterwards only the changed documents are fetched.
	 */
	public list$(): Observable<TrackEntity[]> {
		return this.firestoreSync.list$<TrackEntity>({
			featureKey: TRACK_FEATURE_KEY,
			cacheKey: TRACK_FEATURE_KEY,
			query: query(collection(this.firestore, TRACK_FEATURE_KEY)),
			incremental: true,
		});
	}

	/**
	 * How many tracks have lyrics: the size of `track-lyrics`, counted by
	 * Firestore in one aggregation query. The lyrics stay out of the catalog
	 * cache — they are readable only when signed in — so they are not listed
	 * here. Null when the count cannot be read.
	 */
	public lyricsCount$(): Observable<number | null> {
		return defer(async () => {
			// AngularFire expects its APIs in an injection context.
			const snapshot = await runInInjectionContext(this.injector, () =>
				getCountFromServer(
					collection(this.firestore, TRACK_LYRICS_FEATURE_KEY)
				)
			);

			return snapshot.data().count;
		}).pipe(
			catchError((error) => {
				console.warn('Lyrics count unavailable', error);
				return of(null);
			})
		);
	}
}
