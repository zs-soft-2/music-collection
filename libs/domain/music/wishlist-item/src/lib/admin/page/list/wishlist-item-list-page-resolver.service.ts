import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { WishlistItemStateService } from '@music-collection/api';

@Injectable()
export class WishlistItemListPageResolverService implements Resolve<void> {
	constructor(private wishlistItemStateService: WishlistItemStateService) {}

	public resolve(): void {
		this.wishlistItemStateService.dispatchListEntitiesAction();
		this.wishlistItemStateService.dispatchSetSelectedEntityIdAction('');
		this.wishlistItemStateService.dispatchChangeNewEntityButtonEnabled(
			true
		);
	}
}
