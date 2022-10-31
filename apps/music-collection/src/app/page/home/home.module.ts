import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumCollectionModule } from '@music-collection/domain/album';
import { ArtistCollectionModule } from '@music-collection/domain/artist';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
	declarations: [HomeComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		ArtistCollectionModule,
		AlbumCollectionModule,
	],
})
export class HomeModule {}
