import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	ArtistDetailModule,
	ArtistViewModule,
} from '@music-collection/domain/artist';

import { ArtistPageRoutingModule } from './artist-page-routing.module';
import { ArtistPageComponent } from './artist-page.component';

@NgModule({
	imports: [
		CommonModule,
		ArtistDetailModule,
		ArtistPageRoutingModule,
		ArtistViewModule,
		ArtistPageComponent,
	],
	providers: [],
})
export class ArtistPageModule {}
