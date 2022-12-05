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
> {}
