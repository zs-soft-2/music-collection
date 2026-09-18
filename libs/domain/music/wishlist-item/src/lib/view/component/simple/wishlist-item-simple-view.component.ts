import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { BaseComponent, WishlistItemEntity } from '@music-collection/api';
import {
	DefaultLayoutDirective,
	DefaultLayoutAlignDirective,
	DefaultLayoutGapDirective,
} from 'ng-flex-layout/flex';
import { Bind } from 'primeng/bind';
import { Image } from 'primeng/image';
import { Chip } from 'primeng/chip';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-simple-view',
	templateUrl: './wishlist-item-simple-view.component.html',
	styleUrls: ['./wishlist-item-simple-view.component.scss'],
	imports: [
		DefaultLayoutDirective,
		DefaultLayoutAlignDirective,
		DefaultLayoutGapDirective,
		Bind,
		Image,
		Chip,
	],
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
