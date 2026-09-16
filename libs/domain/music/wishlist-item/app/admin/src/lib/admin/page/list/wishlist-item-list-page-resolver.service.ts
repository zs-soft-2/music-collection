import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { WishlistItemStateService } from '@music-collection/api';

@Injectable()
export class WishlistItemListPageResolverService implements Resolve<void> {
	private wishlistItemStateService = inject(WishlistItemStateService);


	public resolve(): void {
		this.wishlistItemStateService.dispatchListEntitiesAction();
		this.wishlistItemStateService.dispatchSetSelectedEntityIdAction('');
		this.wishlistItemStateService.dispatchChangeNewEntityButtonEnabled(
			true
		);
	}
}
