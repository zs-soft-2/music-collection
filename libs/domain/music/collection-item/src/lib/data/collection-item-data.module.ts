import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CollectionItemDataService } from '@music-collection/api';

import { CollectionItemDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: CollectionItemDataService,
			useClass: CollectionItemDataServiceImpl,
		},
	],
})
export class CollectionItemDataModule {}
