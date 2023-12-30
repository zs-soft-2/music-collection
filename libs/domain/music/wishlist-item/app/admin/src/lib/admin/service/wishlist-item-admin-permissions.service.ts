import { Injectable } from '@angular/core';
import {
	ActionEnum,
	WishlistItemPermissionsService,
	WishlistItemResourceEnum,
} from '@music-collection/api';

@Injectable()
export class WishlistItemAdminPermissionsService extends WishlistItemPermissionsService {
	public static readonly viewWishlistItemAdminPage =
		ActionEnum.VIEW.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ADMIN_PAGE.toString();
	public static readonly viewWishlistItemEditPage =
		ActionEnum.VIEW.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ADMIN_PAGE.toString();
	public static readonly viewWishlistItemListPage =
		ActionEnum.VIEW.toString() +
		WishlistItemResourceEnum.WISHLIST_ITEM_ADMIN_PAGE.toString();
}
