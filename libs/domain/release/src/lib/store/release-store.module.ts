import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	RELEASE_FEATURE_KEY,
	ReleaseStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { ReleaseStateServiceImpl } from './state/release-state.service.impl';
import { ReleaseEffects } from './state/release.effects';
import * as fromRelease from './state/release.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(RELEASE_FEATURE_KEY, fromRelease.reducer),
		EffectsModule.forFeature([ReleaseEffects]),
	],
	providers: [
		{
			provide: ReleaseStateService,
			useClass: ReleaseStateServiceImpl,
		},
	],
})
export class ReleaseStoreModule {}
