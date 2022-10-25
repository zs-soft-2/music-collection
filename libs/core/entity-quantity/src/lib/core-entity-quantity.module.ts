import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { EntityQuantityDataModule } from './data';
import { EntityQuantityStoreModule } from './store';
import { EntityQuantityUtilModule } from './util';

@NgModule({
	imports: [
		CommonModule,
		EntityQuantityDataModule,
		EntityQuantityUtilModule,
		EntityQuantityStoreModule,
	],
})
export class CoreEntityQuantityModule {}
