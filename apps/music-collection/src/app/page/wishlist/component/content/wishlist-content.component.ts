import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent, WishlistItemEntity } from '@music-collection/api';

import { WishlistContentService } from './wishlist-content.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistContentService],
	selector: 'mc-wishlist-content',
	templateUrl: './wishlist-content.component.html',
	styleUrls: ['./wishlist-content.component.scss'],
  standalone: false,
})
export class WishlistContentComponent extends BaseComponent {
	public constructor(private componentService: WishlistContentService) {
		super();
	}

	public selectWishlistItemHandler(wishlistItem: WishlistItemEntity): void {
		this.componentService.selectWishlistItem(wishlistItem);
	}
}
