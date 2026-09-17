import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CoreAuthorizationDataModule } from './data/core-authorization-data.module';
import { CoreAuthorizationStoreModule } from './store/core-authorization-store.module';

@NgModule({
	exports: [CoreAuthorizationStoreModule],
	imports: [
		CommonModule,
		CoreAuthorizationDataModule,
		CoreAuthorizationStoreModule,
	],
})
export class CoreAuthorizationModule {}
