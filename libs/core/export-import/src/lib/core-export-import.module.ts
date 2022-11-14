import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExportImportService } from '@music-collection/api';

import { ExportImportServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: ExportImportService,
			useClass: ExportImportServiceImpl,
		},
	],
})
export class CoreExportImportModule {}
