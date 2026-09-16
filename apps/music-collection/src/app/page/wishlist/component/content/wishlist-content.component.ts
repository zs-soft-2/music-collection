import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
	private componentService = inject(WishlistContentService);


	public selectWishlistItemHandler(wishlistItem: WishlistItemEntity): void {
		this.componentService.selectWishlistItem(wishlistItem);
	}
}
