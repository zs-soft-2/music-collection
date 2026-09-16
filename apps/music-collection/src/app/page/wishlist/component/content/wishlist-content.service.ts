import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
	BaseService,
	WishlistItemEntity,
	WishlistItemStateService,
} from '@music-collection/api';

@Injectable()
export class WishlistContentService extends BaseService {
	private wishlistItemStateService = inject(WishlistItemStateService);
	private router = inject(Router);

	public constructor() {
		super();

		this.wishlistItemStateService.dispatchListEntitiesAction();
	}

	public selectWishlistItem(wishlistItem: WishlistItemEntity): void {
		this.router.navigate(['album', wishlistItem.albumReference.uid]);
	}
}
