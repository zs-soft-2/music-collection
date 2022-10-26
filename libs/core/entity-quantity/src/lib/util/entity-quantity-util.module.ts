import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EntityQuantityUtilService } from '@music-collection/api';

import { EntityQuantityUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule],
	providers: [
		{
			provide: EntityQuantityUtilService,
			useClass: EntityQuantityUtilServiceImpl,
		},
	],
})
export class EntityQuantityUtilModule {}
