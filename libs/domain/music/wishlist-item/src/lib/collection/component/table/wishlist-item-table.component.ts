import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	WishlistItemEntity,
	WishlistItemTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { WishlistItemTableService } from './wishlist-item-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistItemTableService],
	selector: 'mc-wishlist-item-table',
	templateUrl: './wishlist-item-table.component.html',
	styleUrls: ['./wishlist-item-table.component.scss'],
})
export class WishlistItemTableComponent
	extends BaseComponent
	implements OnInit
{
	public params$!: Observable<WishlistItemTableParams>;

	public constructor(private componentService: WishlistItemTableService) {
		super();
	}

	public deleteWishlistItem(wishlistItem: WishlistItemEntity): void {
		console.log(wishlistItem);
	}

	public editWishlistItem(wishlistItem: WishlistItemEntity): void {
		this.componentService.editWishlistItem(wishlistItem);
	}

	public searchByNameHandler(event: any): void {
		this.componentService.searchByName(event['query']);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
