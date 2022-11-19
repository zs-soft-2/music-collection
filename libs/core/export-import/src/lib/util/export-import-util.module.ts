import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExportImportUtilService } from '@music-collection/api';

import { ExportImportUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule],
	providers: [
		{
			provide: ExportImportUtilService,
			useClass: ExportImportUtilServiceImpl,
		},
	],
})
export class ExportImportUtilModule {}
