import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import {
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
} from './wishlist-item';

export abstract class WishlistItemDataService extends FirebaseDataService<
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate
> {
	/** One user's wanted albums (`user/{userId}/wishlist-item`). */
	public abstract listByUser$(
		userId: string
	): Observable<WishlistItemModel[]>;
}
