import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DocumentDataService } from '@music-collection/api';

import { DocumentDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: DocumentDataService,
			useClass: DocumentDataServiceImpl,
		},
	],
})
export class DocumentDataModule {}
