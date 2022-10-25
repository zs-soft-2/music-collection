import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArtistDataModule } from './data/artist-data.module';
import { ArtistStoreModule } from './store/artist-store.module';
import { ArtistUtilModule } from './util/artist-util.module';

@NgModule({
	imports: [
		CommonModule,
		ArtistDataModule,
		ArtistUtilModule,
		ArtistStoreModule,
	],
})
export class DomainArtistModule {}
