import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	SearchParams,
	User,
	UserDataService,
	WishlistItemModel,
	WISHLIST_ITEM_FEATURE_KEY,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
	withLocalUpdatedAt,
} from '@music-collection/api';

import { USER_FEATURE_KEY } from '../../store/state/user.reducer';

@Injectable()
export class UserDataServiceImpl extends UserDataService {
	public constructor() {
		super();

		this.featureKey = USER_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(user: User): Observable<User> {
		return super.addModel$(user);
	}

	public addCollectionItem$(
		collectionItem: CollectionItemModelAdd
	): Observable<CollectionItemModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newCollectionItem: CollectionItemModel = {
			...collectionItem,
			uid,
		};

		return new Observable((subscriber) => {
			const docRef = doc(
				this.firestore,
				USER_FEATURE_KEY,
				newCollectionItem.userId
			);
			const collectionReference = collection(
				docRef,
				COLLECTION_ITEM_FEATURE_KEY
			);

			this.firestoreSync
				.set(
					doc(collectionReference, uid),
					COLLECTION_ITEM_FEATURE_KEY,
					newCollectionItem
				)
				.then(() => {
					subscriber.next({
						...newCollectionItem,
					} as unknown as CollectionItemModel);
				})
				.catch((error) => subscriber.error(error));
		});
	}

	public addWishlistItem$(
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
				USER_FEATURE_KEY,
				newWishlistItem.userReference.uid
			);
			const wishlistReference = collection(
				docRef,
				WISHLIST_ITEM_FEATURE_KEY
			);

			this.firestoreSync
				.set(
					doc(wishlistReference, uid),
					WISHLIST_ITEM_FEATURE_KEY,
					newWishlistItem
				)
				.then(() => {
					subscriber.next({
						...newWishlistItem,
					} as unknown as WishlistItemModel);
				});
		});
	}

	public delete$(user: User): Observable<User> {
		return this.update$(user);
	}

	public deleteCollectionItem$(
		collectionItem: CollectionItemModel
	): Observable<CollectionItemModel> {
		return new Observable((subscriber) => {
			const collectionItemDocument = doc(
				this.firestore,
				`${USER_FEATURE_KEY}/${collectionItem.userId}/${COLLECTION_ITEM_FEATURE_KEY}/${collectionItem.uid}`
			);

			this.firestoreSync
				.delete(collectionItemDocument, COLLECTION_ITEM_FEATURE_KEY)
				.then(() => {
					subscriber.next({
						...collectionItem,
					} as unknown as CollectionItemModel);
				});
		});
	}

	public deleteWishlistItem$(
		wishlistItem: WishlistItemModel
	): Observable<WishlistItemModel> {
		return new Observable((subscriber) => {
			const wishlistItemDocument = doc(
				this.firestore,
				`${USER_FEATURE_KEY}/${wishlistItem.userReference.uid}/${WISHLIST_ITEM_FEATURE_KEY}/${wishlistItem.uid}`
			);

			this.firestoreSync
				.delete(wishlistItemDocument, WISHLIST_ITEM_FEATURE_KEY)
				.then(() => {
					subscriber.next({
						...wishlistItem,
					} as unknown as WishlistItemModel);
				});
		});
	}

	public list$(): Observable<User[]> {
		return super.listModels$();
	}

	public load$(uid: string): Observable<User | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<User[]> {
		throw new Error('Method not implemented.');
	}

	public update$(user: User): Observable<User> {
		return super.updateModel$(user);
	}

	public updateCollectionItem$(
		collectionItem: CollectionItemModelUpdate
	): Observable<CollectionItemModelUpdate> {
		const collectionItemDocument = doc(
			this.firestore,
			`${USER_FEATURE_KEY}/${collectionItem.userId}/${COLLECTION_ITEM_FEATURE_KEY}/${collectionItem.uid}`
		);

		return new Observable((subscriber) => {
			this.firestoreSync
				.update(collectionItemDocument, COLLECTION_ITEM_FEATURE_KEY, {
					...collectionItem,
				})
				.then(() => {
					subscriber.next(withLocalUpdatedAt(collectionItem));
					subscriber.complete();
				})
				.catch((error) => subscriber.error(error));
		});
	}

	public updateCollectionItems$(
		collectionItems: CollectionItemModelUpdate[]
	): Observable<CollectionItemModelUpdate[]> {
		const writes = collectionItems.map((collectionItem) => ({
			reference: doc(
				this.firestore,
				`${USER_FEATURE_KEY}/${collectionItem.userId}/${COLLECTION_ITEM_FEATURE_KEY}/${collectionItem.uid}`
			),
			data: { ...collectionItem },
		}));

		return new Observable((subscriber) => {
			this.firestoreSync
				.setAll(COLLECTION_ITEM_FEATURE_KEY, writes)
				.then(() => {
					subscriber.next(collectionItems.map(withLocalUpdatedAt));
					subscriber.complete();
				})
				.catch((error) => subscriber.error(error));
		});
	}

	public updateWishlistItem$(
		wishlistItem: WishlistItemModelUpdate
	): Observable<WishlistItemModelUpdate> {
		const wishlistItemDocument = doc(
			this.firestore,
			`${USER_FEATURE_KEY}/${wishlistItem.userReference?.uid}/${WISHLIST_ITEM_FEATURE_KEY}/${wishlistItem.uid}`
		);

		return new Observable((subscriber) => {
			this.firestoreSync
				.update(wishlistItemDocument, WISHLIST_ITEM_FEATURE_KEY, {
					...wishlistItem,
				})
				.then(() => {
					subscriber.next(wishlistItem);
				});
		});
	}
}
