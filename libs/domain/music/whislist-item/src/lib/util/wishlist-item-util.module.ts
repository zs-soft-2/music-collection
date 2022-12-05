import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WishlistItemUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { WishlistItemUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule, ReactiveFormsModule],
	providers: [
		{
			provide: WishlistItemUtilService,
			useClass: WishlistItemUtilServiceImpl,
		},
	],
})
export class WishlistItemUtilModule {}
