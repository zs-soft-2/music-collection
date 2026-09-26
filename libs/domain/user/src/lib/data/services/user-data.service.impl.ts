import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	COPY_SERIAL_FEATURE_KEY,
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
	toCopySerialClaimId,
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

	/**
	 * A user dokumentum azonosítója az Auth uid, nem generált: a rules csak
	 * így engedi a saját dokumentum létrehozását (`isSelf(uid)`), a
	 * belépés ezen keresi, és a `USER` szerepkört is ide írja a function
	 * (`assignDefaultRole`). Generált azonosítóval az első belépés írása
	 * elhasalt, és a gyűjtőnek sosem lett se dokumentuma, se jogosultsága.
	 */
	public add$(user: User): Observable<User> {
		if (!user.uid) {
			return super.addModel$(user);
		}

		return new Observable((subscriber) => {
			this.firestoreSync
				.set(doc(this.collection, user.uid), this.featureKey, user)
				.then(() => {
					subscriber.next(withLocalUpdatedAt(user));
					subscriber.complete();
				})
				.catch((error) => subscriber.error(error));
		});
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
					void this.releaseCopySerial(collectionItem);
					subscriber.next({
						...collectionItem,
					} as unknown as CollectionItemModel);
				});
		});
	}

	/**
	 * Gives a numbered copy's number back to the registry once the copy is
	 * gone, so whoever holds the record can write it down. Nearly every copy
	 * carries no number and there is nothing here to do.
	 *
	 * The copy is already deleted by the time this runs, so a failure is
	 * logged rather than raised: it costs one number nobody can claim, which
	 * is less than an error over a deletion that went through.
	 */
	private async releaseCopySerial(
		collectionItem: CollectionItemModel
	): Promise<void> {
		const releaseId = collectionItem.release?.uid ?? null;

		if (!collectionItem.serial || !releaseId) {
			return;
		}

		try {
			await this.firestoreSync.delete(
				doc(
					this.firestore,
					COPY_SERIAL_FEATURE_KEY,
					toCopySerialClaimId(
						releaseId,
						collectionItem.serial.number
					)
				),
				COPY_SERIAL_FEATURE_KEY
			);
		} catch (error) {
			console.error(error);
		}
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
