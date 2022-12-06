import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	WISHLIST_ITEM_FEATURE_KEY,
	WishlistItemStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { WishlistItemStateServiceImpl } from './state/wishlist-item-state.service.impl';
import { WishlistItemEffects } from './state/wishlist-item.effects';
import * as fromWishlistItem from './state/wishlist-item.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(
			WISHLIST_ITEM_FEATURE_KEY,
			fromWishlistItem.reducer
		),
		EffectsModule.forFeature([WishlistItemEffects]),
	],
	providers: [
		{
			provide: WishlistItemStateService,
			useClass: WishlistItemStateServiceImpl,
		},
	],
})
export class WishlistItemStoreModule {}
