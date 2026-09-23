import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collectionGroup, query } from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	WISHLIST_ITEM_FEATURE_KEY,
	WishlistItemEntity,
} from '@music-collection/api';

/**
 * Data access for the wishes. A wish is kept under the collector it belongs
 * to (`user/{uid}/wishlist-item/{itemId}`), so a wish named by its id alone
 * cannot be read as a document: nothing in the id says whose it is.
 *
 * The whole group is read instead and the wish picked out of it. A wantlist
 * is a short list by nature, and the answer is cached until a wish changes,
 * so this costs one pass rather than one per visit.
 */
@Injectable({ providedIn: 'root' })
export class WishlistItemRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** The wish, or null when no collector wants it any more. */
	public get$(itemUid: string): Observable<WishlistItemEntity | null> {
		return this.list$().pipe(
			map((items) => items.find((item) => item.uid === itemUid) ?? null)
		);
	}

	private list$(): Observable<WishlistItemEntity[]> {
		return this.firestoreSync.list$<WishlistItemEntity>({
			featureKey: WISHLIST_ITEM_FEATURE_KEY,
			cacheKey: `${WISHLIST_ITEM_FEATURE_KEY}?all`,
			query: query(
				collectionGroup(this.firestore, WISHLIST_ITEM_FEATURE_KEY)
			),
			bundle: false,
		});
	}
}
