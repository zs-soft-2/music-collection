import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseComponent, WishlistItemEntity } from '@music-collection/api';

import { WishlistContentService } from './wishlist-content.service';
import { WishlistItemCollectionModule } from '@music-collection/domain/wishlist-item';
import { Bind } from 'primeng/bind';
import { ScrollTop } from 'primeng/scrolltop';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistContentService],
	selector: 'mc-wishlist-content',
	templateUrl: './wishlist-content.component.html',
	styleUrls: ['./wishlist-content.component.scss'],
	imports: [WishlistItemCollectionModule, Bind, ScrollTop],
})
export class WishlistContentComponent extends BaseComponent {
	private componentService = inject(WishlistContentService);

	public selectWishlistItemHandler(wishlistItem: WishlistItemEntity): void {
		this.componentService.selectWishlistItem(wishlistItem);
	}
}
