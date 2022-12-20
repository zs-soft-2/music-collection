import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-page',
	templateUrl: './wishlist-page.component.html',
	styleUrls: ['./wishlist-page.component.scss'],
})
export class WishlistPageComponent extends BaseComponent {}
