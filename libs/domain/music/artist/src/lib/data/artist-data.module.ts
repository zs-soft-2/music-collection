import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ArtistDataService } from '@music-collection/api';

import { ArtistDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: ArtistDataService,
			useClass: ArtistDataServiceImpl,
		},
	],
})
export class ArtistDataModule {}
