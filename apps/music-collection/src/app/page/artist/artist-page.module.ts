import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	ArtistDetailModule,
	ArtistViewModule,
} from '@music-collection/domain/artist';

import { ArtistPageRoutingModule } from './artist-page-routing.module';
import { ArtistPageComponent } from './artist-page.component';

@NgModule({
	declarations: [ArtistPageComponent],
	imports: [
		CommonModule,
		ArtistDetailModule,
		ArtistPageRoutingModule,
		ArtistViewModule,
	],
	providers: [],
})
export class ArtistPageModule {}
