import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { WishlistContentComponent } from '../content/wishlist-content.component';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-page',
	templateUrl: './wishlist-page.component.html',
	styleUrls: ['./wishlist-page.component.scss'],
	imports: [WishlistContentComponent],
})
export class WishlistPageComponent extends BaseComponent {}
