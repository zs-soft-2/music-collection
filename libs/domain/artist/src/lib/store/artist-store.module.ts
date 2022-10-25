import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ARTIST_FEATURE_KEY, ArtistStateService } from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { ArtistStateServiceImpl } from './state/artist-state.service.impl';
import { ArtistEffects } from './state/artist.effects';
import * as fromArtist from './state/artist.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(ARTIST_FEATURE_KEY, fromArtist.reducer),
		EffectsModule.forFeature([ArtistEffects]),
	],
	providers: [
		{
			provide: ArtistStateService,
			useClass: ArtistStateServiceImpl,
		},
	],
})
export class ArtistStoreModule {}
