import { Observable, forkJoin, from, map, of } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	Firestore,
	collection,
	doc,
	getDocs,
	query,
	where,
} from '@angular/fire/firestore';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	FirestoreSyncService,
	MEMBERSHIP_FEATURE_KEY,
	MembershipEntity,
} from '@music-collection/api';

/** How many values an `in` filter takes in one query. */
const IN_LIMIT = 30;

/**
 * Data access for `membership` documents (musician ↔ band, from–to years).
 * Every write goes through `FirestoreSyncService`, so the other clients see
 * the change on their next sync instead of holding a stale line-up.
 */
@Injectable({ providedIn: 'root' })
export class MembershipRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The line-up of a band. */
	public listByArtist$(artistUid: string): Observable<MembershipEntity[]> {
		return this.listBy$('artistUid', artistUid);
	}

	/** The bands a musician played in. */
	public listByMusician$(
		musicianUid: string
	): Observable<MembershipEntity[]> {
		return this.listBy$('musicianUid', musicianUid);
	}

	/** Every membership — the relationship network is built from these. */
	public list$(): Observable<MembershipEntity[]> {
		return this.firestoreSync.list$<MembershipEntity>({
			featureKey: MEMBERSHIP_FEATURE_KEY,
			cacheKey: MEMBERSHIP_FEATURE_KEY,
			query: query(collection(this.firestore, MEMBERSHIP_FEATURE_KEY)),
			incremental: true,
		});
	}

	/** Creates or overwrites one membership. */
	public save(membership: MembershipEntity): Promise<void> {
		return this.firestoreSync.set(
			doc(this.firestore, MEMBERSHIP_FEATURE_KEY, membership.uid),
			MEMBERSHIP_FEATURE_KEY,
			membership
		);
	}

	/** Creates or overwrites several memberships in one batch. */
	public saveAll(memberships: MembershipEntity[]): Promise<void> {
		return this.firestoreSync.setAll(
			MEMBERSHIP_FEATURE_KEY,
			memberships.map((membership) => ({
				reference: doc(
					this.firestore,
					MEMBERSHIP_FEATURE_KEY,
					membership.uid
				),
				data: membership,
			}))
		);
	}

	/**
	 * The credits of the given albums. Asked for by album rather than synced:
	 * the contributions outnumber everything else in the catalog, and a
	 * line-up needs the credits of one band's records only.
	 */
	public listContributionsByAlbums$(
		albumUids: string[]
	): Observable<ContributionEntity[]> {
		if (!albumUids.length) {
			return of([]);
		}

		const chunks: string[][] = [];

		for (let index = 0; index < albumUids.length; index += IN_LIMIT) {
			chunks.push(albumUids.slice(index, index + IN_LIMIT));
		}

		return forkJoin(
			chunks.map((chunk) =>
				from(
					getDocs(
						query(
							collection(
								this.firestore,
								CONTRIBUTION_FEATURE_KEY
							),
							where('albumUid', 'in', chunk)
						)
					)
				).pipe(
					map((snapshot) =>
						snapshot.docs.map(
							(document) =>
								({
									...document.data(),
									uid: document.id,
								}) as ContributionEntity
						)
					)
				)
			)
		).pipe(map((results) => results.flat()));
	}

	public remove(uid: string): Promise<void> {
		return this.firestoreSync.delete(
			doc(this.firestore, MEMBERSHIP_FEATURE_KEY, uid),
			MEMBERSHIP_FEATURE_KEY
		);
	}

	/** Served from the local cache while the collection is unchanged. */
	private listBy$(
		field: 'artistUid' | 'musicianUid',
		value: string
	): Observable<MembershipEntity[]> {
		return this.firestoreSync.list$<MembershipEntity>({
			featureKey: MEMBERSHIP_FEATURE_KEY,
			cacheKey: `${MEMBERSHIP_FEATURE_KEY}?${field}=${value}`,
			query: query(
				collection(this.firestore, MEMBERSHIP_FEATURE_KEY),
				where(field, '==', value)
			),
		});
	}
}
