import { Observable, ReplaySubject, tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, EventEmitter } from '@angular/core';
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
	private selectWishlistItem!: EventEmitter<WishlistItemEntity>;

	public constructor(
		private wishlistItemStateService: WishlistItemStateService
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(
		selectWishlistItem: EventEmitter<WishlistItemEntity>
	): Observable<WishlistItemListParams> {
		this.selectWishlistItem = selectWishlistItem;

		return this.wishlistItemStateService.selectEntities$().pipe(
			tap((entities) => {
				if (!entities) {
					this.wishlistItemStateService.dispatchListEntitiesAction();
				}
			}),
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
		this.selectWishlistItem.emit(wishlistItem);
	}
}
