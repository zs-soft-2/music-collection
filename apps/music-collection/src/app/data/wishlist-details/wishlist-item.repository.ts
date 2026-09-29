import { Observable, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection } from '@angular/fire/firestore';
import {
	AuthenticationStateService,
	FirestoreSyncService,
	WISHLIST_ITEM_FEATURE_KEY,
	WishlistItemEntity,
} from '@music-collection/api';

/** Parent of the collectors' own data (`user/{uid}/wishlist-item`). */
const USER_COLLECTION = 'user';

/**
 * Data access for the wishes. A wish is kept under the collector it belongs
 * to (`user/{uid}/wishlist-item/{itemId}`), so a wish named by its id alone
 * cannot be read as a document: nothing in the id says whose it is.
 *
 * The signed-in collector does, though — and a wish page is only ever their
 * own wish (`authenticatedGuard` guards the route, and the list it is opened
 * from is theirs). So their own wantlist is read and the wish picked out of
 * it: a short list by nature, cached until a wish changes, and nobody else's
 * wishes are touched.
 */
@Injectable({ providedIn: 'root' })
export class WishlistItemRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly authentication = inject(AuthenticationStateService);

	/** The wish, or null when the signed-in collector has no such wish. */
	public get$(itemUid: string): Observable<WishlistItemEntity | null> {
		return this.list$().pipe(
			map((items) => items.find((item) => item.uid === itemUid) ?? null)
		);
	}

	private list$(): Observable<WishlistItemEntity[]> {
		return this.authentication.selectAuthenticatedUser$().pipe(
			map((user) => user?.uid ?? ''),
			distinctUntilChanged(),
			switchMap((userId) =>
				userId
					? this.listByUser$(userId)
					: of([] as WishlistItemEntity[])
			)
		);
	}

	private listByUser$(userId: string): Observable<WishlistItemEntity[]> {
		return this.firestoreSync.list$<WishlistItemEntity>({
			featureKey: WISHLIST_ITEM_FEATURE_KEY,
			cacheKey: `${WISHLIST_ITEM_FEATURE_KEY}?userId=${userId}`,
			query: collection(
				this.firestore,
				USER_COLLECTION,
				userId,
				WISHLIST_ITEM_FEATURE_KEY
			),
		});
	}
}
