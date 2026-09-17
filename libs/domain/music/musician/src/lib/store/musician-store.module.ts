import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	MUSICIAN_FEATURE_KEY,
	MusicianStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { MusicianStateServiceImpl } from './state/musician-state.service.impl';
import { MusicianEffects } from './state/musician.effects';
import * as fromMusician from './state/musician.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(MUSICIAN_FEATURE_KEY, fromMusician.reducer),
		EffectsModule.forFeature([MusicianEffects]),
	],
	providers: [
		{
			provide: MusicianStateService,
			useClass: MusicianStateServiceImpl,
		},
	],
})
export class MusicianStoreModule {}
