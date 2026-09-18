import { CommonModule } from '@angular/common';
import { ErrorHandler, NgModule } from '@angular/core';
import { ERROR_FEATURE_KEY, ErrorStateService } from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { GlobalErrorHandler } from './global-error.handler';
import { ErrorEffects, ErrorStateServiceImpl } from './state';
import * as fromError from './state/error.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(ERROR_FEATURE_KEY, fromError.errorReducer),
		EffectsModule.forFeature([ErrorEffects]),
	],
	providers: [
		{ provide: ErrorStateService, useClass: ErrorStateServiceImpl },
		{ provide: ErrorHandler, useClass: GlobalErrorHandler },
	],
})
export class CoreErrorStoreModule {}
