import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WishlistItemDataService } from '@music-collection/api';

import { WishlistItemDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: WishlistItemDataService,
			useClass: WishlistItemDataServiceImpl,
		},
	],
})
export class WishlistItemDataModule {}
