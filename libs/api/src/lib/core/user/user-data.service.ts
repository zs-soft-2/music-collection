import { Observable } from 'rxjs';

import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
} from '../../domain';
import { FirebaseDataService } from '../firebase';
import { User } from './user';

export abstract class UserDataService extends FirebaseDataService<
	User,
	User,
	User
> {
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
	public abstract updateWishlistItem$(
		wishlistItem: WishlistItemModelUpdate
	): Observable<WishlistItemModelUpdate>;
}
