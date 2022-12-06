import { ActionEnum } from '../../../core';
import { WishlistItemResourceEnum } from './wishlist-item-resource.enum';

export class WishlistItemPermissionsService {
	static readonly createWishlistItemEntity =
		ActionEnum.CREATE.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ENTITY.toString();
	static readonly deleteWishlistItemEntity =
		ActionEnum.DELETE.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ENTITY.toString();
	static readonly updateWishlistItemEntity =
		ActionEnum.UPDATE.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ENTITY.toString();
	static readonly viewWishlistItemEntity =
		ActionEnum.VIEW.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ENTITY.toString();
}
