import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	CollectionItemStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { CollectionItemStateServiceImpl } from './state/collection-item-state.service.impl';
import { CollectionItemEffects } from './state/collection-item.effects';
import * as fromCollectionItem from './state/collection-item.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(
			COLLECTION_ITEM_FEATURE_KEY,
			fromCollectionItem.reducer
		),
		EffectsModule.forFeature([CollectionItemEffects]),
	],
	providers: [
		{
			provide: CollectionItemStateService,
			useClass: CollectionItemStateServiceImpl,
		},
	],
})
export class CollectionItemStoreModule {}
