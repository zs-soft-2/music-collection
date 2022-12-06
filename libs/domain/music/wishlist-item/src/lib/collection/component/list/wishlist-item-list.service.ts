import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	WishlistItemEntity,
	WishlistItemListParams,
	WishlistItemStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class WishlistItemListService extends BaseComponent {
	private params!: WishlistItemListParams;
	private params$$: ReplaySubject<WishlistItemListParams>;

	public constructor(
		private wishlistItemStateService: WishlistItemStateService
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<WishlistItemListParams> {
		return this.wishlistItemStateService.selectEntities$().pipe(
			switchMap((wishlistItems) => {
				this.params = {
					wishlistItems,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public selectWishlistItemHandler(wishlistItem: WishlistItemEntity): void {
		this.wishlistItemStateService.dispatchSelectWishlistItemAction(
			wishlistItem
		);
	}
}
