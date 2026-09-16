import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumCollectionModule } from '@music-collection/domain/album';
import { ArtistCollectionModule } from '@music-collection/domain/artist';
import { CollectionItemCollectionModule } from '@music-collection/domain/collection-item';
import { ReleaseCollectionModule } from '@music-collection/domain/release';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
	imports: [
		CommonModule,
		HomeRoutingModule,
		AlbumCollectionModule,
		ArtistCollectionModule,
		ReleaseCollectionModule,
		CollectionItemCollectionModule,
		HomeComponent,
	],
})
export class HomeModule {}
