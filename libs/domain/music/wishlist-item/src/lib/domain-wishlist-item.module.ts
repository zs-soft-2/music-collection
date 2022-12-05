import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WishlistItemDataModule } from './data/wishlist-item-data.module';
import { WishlistItemStoreModule } from './store/wishlist-item-store.module';
import { WishlistItemUtilModule } from './util/wishlist-item-util.module';

@NgModule({
	imports: [
		CommonModule,
		WishlistItemDataModule,
		WishlistItemStoreModule,
		WishlistItemUtilModule,
	],
})
export class DomainWishlistItemModule {}
