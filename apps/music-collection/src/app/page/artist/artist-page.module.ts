import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ArtistViewModule } from '@music-collection/domain/artist';

import { ArtistPageRoutingModule } from './artist-page-routing.module';
import { ArtistPageComponent } from './artist-page.component';

@NgModule({
	declarations: [ArtistPageComponent],
	imports: [CommonModule, ArtistPageRoutingModule, ArtistViewModule],
	providers: [],
})
export class ArtistPageModule {}
