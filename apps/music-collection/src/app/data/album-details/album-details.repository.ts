import { Observable, from, map } from 'rxjs';

import {
	EnvironmentInjector,
	Injectable,
	inject,
	runInInjectionContext,
} from '@angular/core';
import {
	Firestore,
	collection,
	getDocs,
	query,
	where,
} from '@angular/fire/firestore';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	TRACK_FEATURE_KEY,
	TrackEntity,
} from '@music-collection/api';

/**
 * Data access for an album's tracklist and credits (top-level `track` and
 * `contribution` collections, filled by the Discogs import).
 */
@Injectable({ providedIn: 'root' })
export class AlbumDetailsRepository {
	private readonly firestore = inject(Firestore);
	private readonly injector = inject(EnvironmentInjector);

	public listTracks$(albumUid: string): Observable<TrackEntity[]> {
		return this.listByAlbum$<TrackEntity>(TRACK_FEATURE_KEY, albumUid);
	}

	public listContributions$(
		albumUid: string
	): Observable<ContributionEntity[]> {
		return this.listByAlbum$<ContributionEntity>(
			CONTRIBUTION_FEATURE_KEY,
			albumUid
		);
	}

	private listByAlbum$<T>(
		collectionName: string,
		albumUid: string
	): Observable<T[]> {
		// AngularFire expects its APIs to be called in an injection context.
		const snapshot = runInInjectionContext(this.injector, () =>
			getDocs(
				query(
					collection(this.firestore, collectionName),
					where('albumUid', '==', albumUid)
				)
			)
		);

		return from(snapshot).pipe(
			map((result) =>
				result.docs.map((doc) => ({ ...doc.data(), uid: doc.id }) as T)
			)
		);
	}
}
