import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, doc, Firestore, setDoc } from '@angular/fire/firestore';
import {
	WishlistItemDataService,
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
	SearchParams,
	WISHLIST_ITEM_FEATURE_KEY,
} from '@music-collection/api';

@Injectable()
export class WishlistItemDataServiceImpl extends WishlistItemDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

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

			setDoc(doc(collectionReference, uid), newWishlistItem).then(() => {
				subscriber.next({
					...newWishlistItem,
				} as unknown as WishlistItemModel);
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
