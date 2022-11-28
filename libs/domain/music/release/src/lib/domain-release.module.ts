import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReleaseDataModule } from './data/release-data.module';
import { ReleaseStoreModule } from './store/release-store.module';
import { ReleaseUtilModule } from './util/release-util.module';

@NgModule({
	imports: [
		CommonModule,
		ReleaseDataModule,
		ReleaseUtilModule,
		ReleaseStoreModule,
	],
})
export class DomainReleaseModule {}
