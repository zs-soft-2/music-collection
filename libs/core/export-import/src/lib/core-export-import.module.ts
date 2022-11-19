import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExportImportService } from '@music-collection/api';

import { ExportImportServiceImpl } from './service';
import { ExportImportStoreModule } from './store/export-import-store.module';
import { ExportImportUtilModule } from './util/export-import-util.module';

@NgModule({
	imports: [CommonModule, ExportImportStoreModule, ExportImportUtilModule],
	providers: [
		{
			provide: ExportImportService,
			useClass: ExportImportServiceImpl,
		},
	],
})
export class CoreExportImportModule {}
