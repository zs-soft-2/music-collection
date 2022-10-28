import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DocumentUtilService } from '@music-collection/api';

import { DocumentUtilServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: DocumentUtilService,
			useClass: DocumentUtilServiceImpl,
		},
	],
})
export class DocumentUtilModule {}
