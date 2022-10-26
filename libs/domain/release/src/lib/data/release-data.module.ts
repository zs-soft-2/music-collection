import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReleaseDataService } from '@music-collection/api';

import { ReleaseDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: ReleaseDataService,
			useClass: ReleaseDataServiceImpl,
		},
	],
})
export class ReleaseDataModule {}
