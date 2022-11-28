import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LabelDataService } from '@music-collection/api';

import { LabelDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: LabelDataService,
			useClass: LabelDataServiceImpl,
		},
	],
})
export class LabelDataModule {}
