import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CollectionItemUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { CollectionItemUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule, ReactiveFormsModule],
	providers: [
		{
			provide: CollectionItemUtilService,
			useClass: CollectionItemUtilServiceImpl,
		},
	],
})
export class CollectionItemUtilModule {}
