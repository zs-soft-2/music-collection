import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	deleteDoc,
	doc,
	Firestore,
	setDoc,
	updateDoc,
} from '@angular/fire/firestore';
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
} from '@music-collection/api';

import { USER_FEATURE_KEY } from '../../store/state/user.reducer';

@Injectable()
export class UserDataServiceImpl extends UserDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

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

			setDoc(doc(collectionReference, uid), newCollectionItem).then(
				() => {
					subscriber.next({
						...newCollectionItem,
					} as unknown as CollectionItemModel);
				}
			);
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

			setDoc(doc(wishlistReference, uid), newWishlistItem).then(() => {
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

			deleteDoc(collectionItemDocument).then(() => {
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

			deleteDoc(wishlistItemDocument).then(() => {
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
			updateDoc(collectionItemDocument, { ...collectionItem }).then(
				() => {
					subscriber.next(collectionItem);
				}
			);
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
			updateDoc(wishlistItemDocument, { ...wishlistItem }).then(() => {
				subscriber.next(wishlistItem);
			});
		});
	}
}
