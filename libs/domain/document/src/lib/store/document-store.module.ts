import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	DOCUMENT_FEATURE_KEY,
	DocumentStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { DocumentStateServiceImpl } from './state/document-state.service.impl';
import { DocumentEffects } from './state/document.effects';
import * as fromDocument from './state/document.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(DOCUMENT_FEATURE_KEY, fromDocument.reducer),
		EffectsModule.forFeature([DocumentEffects]),
	],
	providers: [
		{
			provide: DocumentStateService,
			useClass: DocumentStateServiceImpl,
		},
	],
})
export class DocumentStoreModule {}
