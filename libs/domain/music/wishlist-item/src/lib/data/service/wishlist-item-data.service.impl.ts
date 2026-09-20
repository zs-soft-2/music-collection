import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import {
	WishlistItemDataService,
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
	SearchParams,
	WISHLIST_ITEM_FEATURE_KEY,
	withLocalUpdatedAt,
} from '@music-collection/api';

/** Parent of the users' own data (`user/{uid}/wishlist-item`). */
const USER_COLLECTION = 'user';

@Injectable()
export class WishlistItemDataServiceImpl extends WishlistItemDataService {
	public constructor() {
		super();

		this.featureKey = WISHLIST_ITEM_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(
		wishlistItem: WishlistItemModelAdd
	): Observable<WishlistItemModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newWishlistItem: WishlistItemModel = {
			...wishlistItem,
			uid,
		};

		return new Observable((subscriber) => {
			const docRef = doc(
				this.firestore,
				WISHLIST_ITEM_FEATURE_KEY,
				newWishlistItem.uid
			);
			const collectionReference = collection(
				docRef,
				WISHLIST_ITEM_FEATURE_KEY
			);

			this.firestoreSync
				.set(
					doc(collectionReference, uid),
					WISHLIST_ITEM_FEATURE_KEY,
					newWishlistItem
				)
				.then(() => {
					subscriber.next(
						withLocalUpdatedAt(
							newWishlistItem
						) as unknown as WishlistItemModel
					);
				});
		});
	}

	public delete$(
		wishlistItem: WishlistItemModel
	): Observable<WishlistItemModel> {
		return this.update$(
			wishlistItem as WishlistItemModelUpdate
		) as Observable<WishlistItemModel>;
	}

	public list$(): Observable<WishlistItemModel[]> {
		return super.listModels$();
	}

	public listByUser$(userId: string): Observable<WishlistItemModel[]> {
		return this.firestoreSync.list$<WishlistItemModel>({
			featureKey: this.featureKey,
			cacheKey: `${this.featureKey}?userId=${userId}`,
			query: collection(
				this.firestore,
				USER_COLLECTION,
				userId,
				this.featureKey
			),
		});
	}

	public listByIds$(ids: string[]): Observable<WishlistItemModel[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<WishlistItemModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<WishlistItemModel[]> {
		return super.searchModel$(params);
	}

	public update$(
		wishlistItem: WishlistItemModelUpdate
	): Observable<WishlistItemModelUpdate> {
		return super.updateModel$(wishlistItem);
	}
}
