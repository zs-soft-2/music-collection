import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
	Firestore,
	collection,
	collectionGroup,
	getCountFromServer,
	getDocs,
	query,
	where,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	AlbumDeletionRepository,
	AlbumEntity,
	COLLECTION_ITEM_FEATURE_KEY,
	EntityUsage,
	EntityUsageHold,
	RELEASE_FEATURE_KEY,
	TRACK_FEATURE_KEY,
} from '@music-collection/api';

/** The callable that does the deleting; see `apps/functions/src/index.ts`. */
export const DELETE_ALBUM_ENTITY_FUNCTION = 'deleteAlbumEntity';

/** Parent of the users' own data (`user/{uid}/collection-item`). */
const USER_COLLECTION = 'user';

/** An `in` filter takes at most 30 values. */
const IN_QUERY_LIMIT = 30;

@Injectable({ providedIn: 'root' })
export class AlbumDeletionFirestoreRepository extends AlbumDeletionRepository {
	private readonly auth = inject(Auth);
	private readonly firestore = inject(Firestore);
	private readonly functions = inject(Functions);

	/**
	 * The pressings are read (a handful of public documents), the rest is
	 * counted against the server. Copies are counted twice — on every shelf
	 * and on the caller's own — because the difference is the answer: the
	 * caller's own copies go with the album, anybody else's stop it.
	 */
	public usage$(album: AlbumEntity): Observable<EntityUsage> {
		return from(this.usage(album));
	}

	/**
	 * The client asked first so the dialog could say what goes; this asks
	 * the server, which asks again inside a transaction.
	 */
	public delete$(album: AlbumEntity): Observable<void> {
		const callable = httpsCallable<
			{ uid: string; artistUid: string | null },
			{ uid: string }
		>(this.functions, DELETE_ALBUM_ENTITY_FUNCTION);

		return from(
			callable({ uid: album.uid, artistUid: album.artist?.uid ?? null })
		).pipe(map(() => undefined));
	}

	private async usage(album: AlbumEntity): Promise<EntityUsage> {
		const releases = await getDocs(
			query(
				collectionGroup(this.firestore, RELEASE_FEATURE_KEY),
				where('album.uid', '==', album.uid)
			)
		);
		const chunks = chunked([
			...new Set(
				releases.docs.map(
					(document) =>
						(document.get('uid') as string | undefined) ??
						document.id
				)
			),
		]);
		const userUid = this.auth.currentUser?.uid ?? null;

		const [copies, ownCopies, tracks] = await Promise.all([
			this.sum(
				chunks.map((chunk) =>
					query(
						collectionGroup(
							this.firestore,
							COLLECTION_ITEM_FEATURE_KEY
						),
						where('release.uid', 'in', chunk)
					)
				)
			),
			userUid
				? this.sum(
						chunks.map((chunk) =>
							query(
								collection(
									this.firestore,
									USER_COLLECTION,
									userUid,
									COLLECTION_ITEM_FEATURE_KEY
								),
								where('release.uid', 'in', chunk)
							)
						)
					)
				: Promise.resolve(0),
			this.count(
				query(
					collection(this.firestore, TRACK_FEATURE_KEY),
					where('albumUid', '==', album.uid)
				)
			),
		]);

		return {
			blocking: hold(
				COLLECTION_ITEM_FEATURE_KEY,
				Math.max(copies - ownCopies, 0)
			),
			cascading: [
				...hold(RELEASE_FEATURE_KEY, releases.size),
				...hold(TRACK_FEATURE_KEY, tracks),
				...hold(COLLECTION_ITEM_FEATURE_KEY, ownCopies),
			],
		};
	}

	private async sum(
		queries: ReturnType<typeof query>[]
	): Promise<number> {
		const counts = await Promise.all(
			queries.map((constrained) => this.count(constrained))
		);

		return counts.reduce((total, count) => total + count, 0);
	}

	/**
	 * How many documents the query matches, or zero when it cannot be asked.
	 * A zero here is not a permission to delete: the server counts again.
	 */
	private count(constrained: ReturnType<typeof query>): Promise<number> {
		return getCountFromServer(constrained)
			.then((snapshot) => snapshot.data().count)
			.catch((error) => {
				console.warn('Album usage could not be counted', error);

				return 0;
			});
	}
}

/** One hold, or none at all when nothing was found. */
function hold(featureKey: string, count: number): EntityUsageHold[] {
	return count > 0 ? [{ featureKey, count }] : [];
}

function chunked<T>(values: T[]): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < values.length; index += IN_QUERY_LIMIT) {
		chunks.push(values.slice(index, index + IN_QUERY_LIMIT));
	}

	return chunks;
}
