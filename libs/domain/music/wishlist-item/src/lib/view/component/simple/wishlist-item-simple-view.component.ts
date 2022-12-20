import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { BaseComponent, WishlistItemEntity } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-simple-view',
	templateUrl: './wishlist-item-simple-view.component.html',
	styleUrls: ['./wishlist-item-simple-view.component.scss'],
})
export class WishlistItemSimpleViewComponent extends BaseComponent {
	@Input()
	public wishlistItem!: WishlistItemEntity;
	@Output()
	public selectWishlistItem: EventEmitter<void>;
	@Input()
	public width = '200';
	@Input()
	public layout: 'horizontal' | 'vertical' = 'horizontal';

	public constructor() {
		super();

		this.selectWishlistItem = new EventEmitter();
	}

	public wishlistItemClickHandler(): void {
		this.selectWishlistItem.emit();
	}
}
