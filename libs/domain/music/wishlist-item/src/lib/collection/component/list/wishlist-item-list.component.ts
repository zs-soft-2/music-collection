import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
} from '@angular/core';
import {
	WishlistItemEntity,
	WishlistItemListParams,
	BaseComponent,
} from '@music-collection/api';

import { WishlistItemListService } from './wishlist-item-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistItemListService],
	selector: 'mc-wishlist-item-list',
	templateUrl: './wishlist-item-list.component.html',
	styleUrls: ['./wishlist-item-list.component.scss'],
  standalone: false,
})
export class WishlistItemListComponent extends BaseComponent implements OnInit {
	public params$!: Observable<WishlistItemListParams>;
	@Output()
	public selectWishlistItem: EventEmitter<WishlistItemEntity>;

	public constructor(private componentService: WishlistItemListService) {
		super();

		this.selectWishlistItem = new EventEmitter();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.selectWishlistItem);
	}

	public selectWishlistItemHandler(wishlistItem: WishlistItemEntity): void {
		this.componentService.selectWishlistItemHandler(wishlistItem);
	}
}
