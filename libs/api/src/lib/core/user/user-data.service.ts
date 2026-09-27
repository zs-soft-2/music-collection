import { Observable } from 'rxjs';

import { User } from '@music-collection/core/api';

import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
} from '../../domain';
import { FirebaseDataService } from '../firebase';

export abstract class UserDataService extends FirebaseDataService<
	User,
	User,
	User
> {
	/**
	 * The user document, read once and from the server where there is one.
	 *
	 * The sign-in asks with this rather than with `load$`. That one listens,
	 * and a listener answers from the IndexedDB cache first: a cache that has
	 * never seen this collector reports no such user, on which the sign-in
	 * sets about creating one over the top of the real document — a write the
	 * rules turn down, because it would take the collector's role off it.
	 */
	public abstract loadExisting$(uid: string): Observable<User | undefined>;
	public abstract addCollectionItem$(
		collectionItem: CollectionItemModelAdd
	): Observable<CollectionItemModel>;
	public abstract addWishlistItem$(
		wishlistItem: WishlistItemModelAdd
	): Observable<WishlistItemModel>;
	public abstract deleteCollectionItem$(
		collectionItem: CollectionItemModel
	): Observable<CollectionItemModel>;
	public abstract deleteWishlistItem$(
		wishlistItem: WishlistItemModel
	): Observable<WishlistItemModel>;
	public abstract updateCollectionItem$(
		collectionItem: CollectionItemModelUpdate
	): Observable<CollectionItemModelUpdate>;
	/**
	 * Updates several copies of one collector in a single batch — a shelf
	 * rearranged by hand moves many records at once, and half a rearranged
	 * compartment is no state to leave behind.
	 */
	public abstract updateCollectionItems$(
		collectionItems: CollectionItemModelUpdate[]
	): Observable<CollectionItemModelUpdate[]>;
	public abstract updateWishlistItem$(
		wishlistItem: WishlistItemModelUpdate
	): Observable<WishlistItemModelUpdate>;
}
