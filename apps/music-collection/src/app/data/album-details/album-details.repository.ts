import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where } from '@angular/fire/firestore';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	FirestoreSyncService,
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
	private readonly firestoreSync = inject(FirestoreSyncService);

	public listTracks$(albumUid: string): Observable<TrackEntity[]> {
		return this.listByAlbum$<TrackEntity>(TRACK_FEATURE_KEY, albumUid);
	}

	/**
	 * The tracks only this pressing has — a bonus cut, a side a reissue
	 * added. They carry the album too, so they are never the whole
	 * tracklist: they are what a copy of this release plays beyond it.
	 */
	public listTracksByRelease$(releaseUid: string): Observable<TrackEntity[]> {
		return this.firestoreSync.list$<TrackEntity>({
			featureKey: TRACK_FEATURE_KEY,
			cacheKey: `${TRACK_FEATURE_KEY}?releaseUid=${releaseUid}`,
			query: query(
				collection(this.firestore, TRACK_FEATURE_KEY),
				where('releaseUid', '==', releaseUid)
			),
		});
	}

	public listContributions$(
		albumUid: string
	): Observable<ContributionEntity[]> {
		return this.listByAlbum$<ContributionEntity>(
			CONTRIBUTION_FEATURE_KEY,
			albumUid
		);
	}

	/** Served from the local cache while the collection is unchanged. */
	private listByAlbum$<T>(
		collectionName: string,
		albumUid: string
	): Observable<T[]> {
		return this.firestoreSync.list$<T>({
			featureKey: collectionName,
			cacheKey: `${collectionName}?albumUid=${albumUid}`,
			query: query(
				collection(this.firestore, collectionName),
				where('albumUid', '==', albumUid)
			),
		});
	}
}
