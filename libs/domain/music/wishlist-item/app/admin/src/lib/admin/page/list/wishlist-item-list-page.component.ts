import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { WishlistItemCollectionModule } from '@music-collection/domain/wishlist-item';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-list-page',
	templateUrl: './wishlist-item-list-page.component.html',
	styleUrls: ['./wishlist-item-list-page.component.scss'],
	imports: [WishlistItemCollectionModule],
})
export class WishlistItemListPageComponent extends BaseComponent {}
