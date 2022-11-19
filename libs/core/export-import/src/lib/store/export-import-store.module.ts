import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExportImportStateService } from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { ExportImportEffects, ExportImportStateServiceImpl } from './state';
import * as fromExportImport from './state/export-import.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(
			'export-import',
			fromExportImport.exportImportReducer
		),
		EffectsModule.forFeature([ExportImportEffects]),
	],
	providers: [
		{
			provide: ExportImportStateService,
			useClass: ExportImportStateServiceImpl,
		},
	],
})
export class ExportImportStoreModule {}
