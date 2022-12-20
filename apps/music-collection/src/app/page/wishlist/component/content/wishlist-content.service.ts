import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
	BaseService,
	WishlistItemEntity,
	WishlistItemStateService,
} from '@music-collection/api';

@Injectable()
export class WishlistContentService extends BaseService {
	public constructor(
		private wishlistItemStateService: WishlistItemStateService,
		private router: Router
	) {
		super();

		this.wishlistItemStateService.dispatchListEntitiesAction();
	}

	public selectWishlistItem(wishlistItem: WishlistItemEntity): void {
		this.router.navigate(['album', wishlistItem.albumReference.uid]);
	}
}
