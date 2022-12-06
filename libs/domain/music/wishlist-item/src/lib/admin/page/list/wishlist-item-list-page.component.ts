import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-list-page',
	templateUrl: './wishlist-item-list-page.component.html',
	styleUrls: ['./wishlist-item-list-page.component.scss'],
})
export class WishlistItemListPageComponent extends BaseComponent {}
