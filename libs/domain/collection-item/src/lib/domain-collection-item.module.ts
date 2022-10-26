import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CollectionItemDataModule } from './data/collection-item-data.module';
import { CollectionItemStoreModule } from './store/collection-item-store.module';
import { CollectionItemUtilModule } from './util/collection-item-util.module';

@NgModule({
	imports: [
		CommonModule,
		CollectionItemDataModule,
		CollectionItemUtilModule,
		CollectionItemStoreModule,
	],
})
export class DomainCollectionItemModule {}
