import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { FormsModule } from '@angular/forms';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	WishlistItemEntity,
	WishlistItemTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { WishlistItemTableService } from './wishlist-item-table.service';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistItemTableService],
	selector: 'mc-wishlist-item-table',
	templateUrl: './wishlist-item-table.component.html',
	styleUrls: ['./wishlist-item-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Chip,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		CollectionColumnDirective,
		CollectionListComponent,
		EntityCardComponent,
		ViewActionComponent,
	],
})
export class WishlistItemTableComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(WishlistItemTableService);

	public params$!: Observable<WishlistItemTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	/** The cover of the wished album, if it has one. */
	public imageOf(wishlistItem: WishlistItemEntity): string | null {
		return wishlistItem.albumReference?.coverImage?.filePath || null;
	}

	public clearSearch(): void {
		this.componentService.clearSearch();
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

	/** Where the eye leads: the page that shows this wishlist item. */
	public viewLink(wishlistItem: WishlistItemEntity): unknown[] {
		return this.componentService.viewLink(wishlistItem);
	}
}
